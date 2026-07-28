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
  // The category is: english_improvement_of_sentences_practice_practice
  // The mock test with questions is: english_improvement_of_sentences_practice_default
  // We need the category's "default" mock test to be linked correctly.
  // 
  // Plan:
  // 1. Find or create Exam and TestSeries under the practice category
  // 2. Re-link the existing mock test to the correct TestSeries
  // 3. Also create a direct _default mock test for the _practice_practice category

  const catId = 'english_improvement_of_sentences_practice_practice';
  const existingMockTestId = 'english_improvement_of_sentences_practice_default';

  console.log('=== Fixing improvement of sentences practice category ===\n');

  // Step 1: Ensure exam exists under the category
  let exam = await prisma.exam.findFirst({ where: { categoryId: catId } });
  if (!exam) {
    console.log('Creating exam under category...');
    exam = await prisma.exam.create({
      data: {
        id: `${catId}_exam`,
        categoryId: catId,
        name: 'English (Improvement Of Sentences) Practice Exam'
      }
    });
  }
  console.log('Exam:', exam.id);

  // Step 2: Ensure test series exists under exam
  let series = await prisma.testSeries.findFirst({ where: { examId: exam.id } });
  if (!series) {
    console.log('Creating test series under exam...');
    series = await prisma.testSeries.create({
      data: {
        id: `${catId}_series`,
        examId: exam.id,
        title: 'English (Improvement Of Sentences) Practice Series'
      }
    });
  }
  console.log('Series:', series.id);

  // Step 3: Re-link existing mock test to the correct series under this category
  const existingMockTest = await prisma.mockTest.findUnique({ where: { id: existingMockTestId } });
  if (existingMockTest) {
    console.log(`Re-linking mock test ${existingMockTestId} to series ${series.id}...`);
    await prisma.mockTest.update({
      where: { id: existingMockTestId },
      data: { testSeriesId: series.id }
    });
    console.log('Mock test re-linked.');
  }

  // Step 4: Create a _default mock test for the _practice_practice category ID
  // pointing to same questions via URL
  const defaultTestId = `${catId}_default`;
  const existingDefaultTest = await prisma.mockTest.findUnique({ where: { id: defaultTestId } });
  if (!existingDefaultTest) {
    console.log(`Creating default mock test ${defaultTestId} linked to series...`);
    const questionsUrl = 'https://fly.storage.tigris.dev/mocktest-assets/questions_english_improvement_of_sentences_practice_default.json';
    await prisma.mockTest.create({
      data: {
        id: defaultTestId,
        testSeriesId: series.id,
        title: 'Practice Questions Set (English Improvement Of Sentences)',
        durationMinutes: 20,
        questionsCount: 1652,
        maxMarks: 50,
        requiredTierName: 'None',
        customQuestions: { url: questionsUrl }
      }
    });
    console.log('Default mock test created.');
  } else {
    console.log(`Default mock test ${defaultTestId} already exists.`);
    // Ensure it points to the correct series
    await prisma.mockTest.update({
      where: { id: defaultTestId },
      data: { testSeriesId: series.id }
    });
    console.log('Default mock test series updated.');
  }

  // Step 5: Verify
  const verifyCategory = await prisma.category.findUnique({ where: { id: catId }, });
  const verifyExam = await prisma.exam.findFirst({ where: { categoryId: catId } });
  const verifySeries = await prisma.testSeries.findFirst({ where: { examId: verifyExam?.id } });
  const verifyTests = await prisma.mockTest.findMany({ where: { testSeriesId: verifySeries?.id } });

  console.log('\n=== Verification ===');
  console.log('Category:', verifyCategory?.id, '/', verifyCategory?.name);
  console.log('Exam:', verifyExam?.id, '/', verifyExam?.name);
  console.log('Series:', verifySeries?.id, '/', verifySeries?.title);
  console.log('MockTests:');
  verifyTests.forEach(t => {
    const cq = t.customQuestions;
    console.log(`  - ${t.id} (${t.questionsCount} qs, customQ: ${cq?.url ? 'URL stored' : JSON.stringify(cq).slice(0, 60)})`);
  });

  console.log('\nFix completed!');
}

fix().catch(console.error).finally(() => { prisma.$disconnect(); pool.end(); });
