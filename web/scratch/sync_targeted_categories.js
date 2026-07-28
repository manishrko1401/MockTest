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

async function syncTargetedPracticeCategories() {
  // Delete any auto-generated categories ending in "_practice" if they don't match the actual uploaded sets
  await prisma.category.deleteMany({
    where: {
      id: { endsWith: '_practice' },
      NOT: [
        { id: 'english_synonyms_practice' },
        { id: 'english_antonyms_practice' },
        { id: 'english_one_word_substitution_practice' },
        { id: 'english_active_passive_voice_practice' },
        { id: 'english_direct_indirect_speech_narration_practice' },
        { id: 'english_fill_in_the_blanks_practice' },
        { id: 'railways_practice_domain' },
        { id: 'banking_practice_domain' },
        { id: 'state_practice_domain' },
        { id: 'teaching_practice_domain' }
      ]
    }
  });

  const practiceDomains = [
    {
      id: 'english_synonyms_practice',
      name: 'English Synonyms Practice Series',
      description: 'Comprehensive Vocabulary Synonyms Practice Sets (890+ Questions)',
      countText: '890+ Questions'
    },
    {
      id: 'english_antonyms_practice',
      name: 'English Antonyms Practice Series',
      description: 'Comprehensive Vocabulary Antonyms Practice Sets (880+ Questions)',
      countText: '880+ Questions'
    },
    {
      id: 'english_one_word_substitution_practice',
      name: 'One Word Substitution Practice Series',
      description: 'One Word Substitution Practice Sets (1060+ Questions)',
      countText: '1060+ Questions'
    },
    {
      id: 'english_active_passive_voice_practice',
      name: 'Active & Passive Voice Practice Series',
      description: 'Active and Passive Voice Practice Sets (780+ Questions)',
      countText: '780+ Questions'
    },
    {
      id: 'english_direct_indirect_speech_narration_practice',
      name: 'Direct & Indirect Speech Narration Practice',
      description: 'Direct & Indirect Speech Narration Practice Sets (860+ Questions)',
      countText: '860+ Questions'
    },
    {
      id: 'english_fill_in_the_blanks_practice',
      name: 'Fill in the Blanks Practice Series',
      description: 'Fill in the Blanks & Grammar Practice Sets (1170+ Questions)',
      countText: '1170+ Questions'
    }
  ];

  for (const domain of practiceDomains) {
    console.log(`Syncing category: ${domain.id} - ${domain.name}`);

    // 1. Create/Update Category
    const cat = await prisma.category.upsert({
      where: { id: domain.id },
      update: {
        isPracticeSeries: true,
        name: domain.name,
        description: domain.description,
        countText: domain.countText
      },
      create: {
        id: domain.id,
        name: domain.name,
        isPracticeSeries: true,
        description: domain.description,
        countText: domain.countText
      }
    });

    // 2. Create/Update Exam
    const examId = `${domain.id}_exam`;
    const exam = await prisma.exam.upsert({
      where: { id: examId },
      update: { name: `${domain.name} Exam` },
      create: {
        id: examId,
        categoryId: cat.id,
        name: `${domain.name} Exam`
      }
    });

    // 3. Create/Update TestSeries
    const seriesId = `${domain.id}_series`;
    const series = await prisma.testSeries.upsert({
      where: { id: seriesId },
      update: { title: `${domain.name} Series` },
      create: {
        id: seriesId,
        examId: exam.id,
        title: `${domain.name} Series`
      }
    });

    // 4. Find customQuestions from any existing uploaded test for this category
    const existingTest = await prisma.mockTest.findFirst({
      where: {
        OR: [
          { id: { contains: domain.id } },
          { id: { contains: domain.id.replace(/_practice$/, '') } }
        ],
        customQuestions: { not: null }
      }
    });

    const questionsData = existingTest?.customQuestions || null;
    const qCount = existingTest?.questionsCount || 100;

    // Standardize alias test IDs so get-custom-questions API finds them for any variant ID
    const aliases = [
      `${domain.id}_default`,
      `${domain.id}_practice_default`,
      `${domain.id}_practice_practice_default`,
      `${domain.id.replace(/_practice$/, '')}_default`,
      `${domain.id.replace(/_practice$/, '')}_practice_default`
    ];

    for (const aliasId of aliases) {
      await prisma.mockTest.upsert({
        where: { id: aliasId },
        update: {
          testSeriesId: series.id,
          title: `Practice Questions Set (${domain.name})`,
          questionsCount: qCount,
          customQuestions: questionsData
        },
        create: {
          id: aliasId,
          testSeriesId: series.id,
          title: `Practice Questions Set (${domain.name})`,
          durationMinutes: 20,
          questionsCount: qCount,
          maxMarks: qCount * 2,
          requiredTierName: 'None',
          customQuestions: questionsData
        }
      });
    }
  }

  console.log("\nTargeted Sync Finished Successfully!");
}

syncTargetedPracticeCategories()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
