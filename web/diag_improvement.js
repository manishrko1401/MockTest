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
const prisma = new PrismaClient({ adapter: new (require('@prisma/adapter-pg').PrismaPg)(pool) });

async function run() {
  // 1. Find all categories with "improvement" or "sentence" in name or id
  console.log('\n=== Searching DB for improvement/sentence categories ===');
  const cats = await prisma.category.findMany({
    where: {
      OR: [
        { id: { contains: 'improvement', mode: 'insensitive' } },
        { id: { contains: 'sentence', mode: 'insensitive' } },
        { name: { contains: 'improvement', mode: 'insensitive' } },
        { name: { contains: 'sentence', mode: 'insensitive' } },
      ]
    }
  });
  console.log('Categories:', JSON.stringify(cats, null, 2));

  // 2. Find all mock tests with "improvement" in title or id
  console.log('\n=== Searching DB for improvement mock tests ===');
  const tests = await prisma.mockTest.findMany({
    where: {
      OR: [
        { id: { contains: 'improvement', mode: 'insensitive' } },
        { title: { contains: 'improvement', mode: 'insensitive' } },
      ]
    },
    select: { id: true, title: true, testSeriesId: true, questionsCount: true, customQuestions: true }
  });
  
  tests.forEach(t => {
    console.log(`\nMockTest ID: ${t.id}`);
    console.log(`  Title: ${t.title}`);
    console.log(`  TestSeriesId: ${t.testSeriesId}`);
    console.log(`  QuestionsCount: ${t.questionsCount}`);
    console.log(`  customQuestions type: ${Array.isArray(t.customQuestions) ? 'array' : typeof t.customQuestions}`);
    if (t.customQuestions && !Array.isArray(t.customQuestions)) {
      console.log(`  customQuestions:`, t.customQuestions);
    } else if (Array.isArray(t.customQuestions)) {
      console.log(`  customQuestions array length: ${t.customQuestions.length}`);
    }
  });

  // 3. Get the TestSeries and find what category they belong to
  if (tests.length > 0) {
    const seriesIds = [...new Set(tests.map(t => t.testSeriesId))];
    console.log('\n=== TestSeries for these mock tests ===');
    for (const seriesId of seriesIds) {
      const series = await prisma.testSeries.findUnique({
        where: { id: seriesId },
        include: { exam: { include: { category: true } } }
      });
      if (series) {
        console.log(`Series: ${seriesId}`);
        console.log(`  Exam: ${series.exam?.id} / ${series.exam?.name}`);
        console.log(`  Category: ${series.exam?.category?.id} / ${series.exam?.category?.name}`);
        console.log(`  isPracticeSeries: ${series.exam?.category?.isPracticeSeries}`);
      }
    }
  }
}

run().catch(console.error).finally(() => { prisma.$disconnect(); pool.end(); });
