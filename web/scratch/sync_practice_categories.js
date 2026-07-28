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

async function syncPracticeCategories() {
  console.log("Checking all mockTests to find uploaded practice series question sets...");
  const tests = await prisma.mockTest.findMany({
    where: { customQuestions: { not: null } },
    select: { id: true, title: true, questionsCount: true }
  });

  console.log(`Found ${tests.length} tests with custom questions.`);

  for (const t of tests) {
    console.log(`Examining test: ${t.id} ("${t.title}")`);
    
    // Deduce categoryId from testId
    let catId = t.id
      .replace(/_practice_practice_default|_practice_default|_default/g, '')
      .replace(/__practice$/, '_practice');
    
    if (!catId.includes('practice')) {
      catId = `${catId}_practice`;
    }

    // Format readable category name
    let catName = catId
      .replace(/_/g, ' ')
      .replace(/\b(en|hi)\b/gi, '')
      .replace(/practice/gi, 'Practice Series')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, c => c.toUpperCase());

    if (!catName.toLowerCase().includes('practice')) {
      catName = `${catName} Practice Series`;
    }

    console.log(` -> Mapping to Category ID: "${catId}", Name: "${catName}"`);

    // 1. Ensure Category exists in DB
    const cat = await prisma.category.upsert({
      where: { id: catId },
      update: {
        isPracticeSeries: true,
        name: catName,
        description: `${catName} - Topic-wise & Sectional Practice Series`
      },
      create: {
        id: catId,
        name: catName,
        isPracticeSeries: true,
        description: `${catName} - Topic-wise & Sectional Practice Series`,
        countText: `${t.questionsCount || 100}+ Questions`
      }
    });

    // 2. Ensure Exam (Subcategory) exists
    const examId = `${catId}_exam`;
    const exam = await prisma.exam.upsert({
      where: { id: examId },
      update: { name: `${catName} Exam` },
      create: {
        id: examId,
        categoryId: cat.id,
        name: `${catName} Exam`
      }
    });

    // 3. Ensure TestSeries (Subsubcategory) exists
    const seriesId = `${catId}_series`;
    const series = await prisma.testSeries.upsert({
      where: { id: seriesId },
      update: { title: `${catName} Series` },
      create: {
        id: seriesId,
        examId: exam.id,
        title: `${catName} Series`
      }
    });

    // 4. Update the MockTest to point to this testSeriesId
    await prisma.mockTest.update({
      where: { id: t.id },
      data: { testSeriesId: series.id }
    });

    // 5. Also ensure standard default test aliases exist so loadDomainQuestions finds them
    const alias1 = `${catId}_default`;
    const alias2 = `${catId}_practice_default`;
    
    for (const aliasId of [alias1, alias2]) {
      if (aliasId !== t.id) {
        const existing = await prisma.mockTest.findUnique({ where: { id: aliasId } });
        if (!existing) {
          await prisma.mockTest.create({
            data: {
              id: aliasId,
              testSeriesId: series.id,
              title: t.title,
              questionsCount: t.questionsCount,
              durationMinutes: 20,
              maxMarks: (t.questionsCount || 25) * 2,
              requiredTierName: 'None',
              customQuestions: t.customQuestions
            }
          }).catch(e => console.log(`Alias create note: ${e.message}`));
        }
      }
    }
  }

  console.log("\nSync Completed successfully! All uploaded practice question sets are now properly registered as practice categories in the DB.");
}

syncPracticeCategories()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
