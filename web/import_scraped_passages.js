require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = (process.env.TYPING_DATABASE_URL || process.env.DATABASE_URL || '').trim();

if (!connectionString) {
  console.error("No DATABASE_URL or TYPING_DATABASE_URL found in .env / .env.local!");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function importPassages() {
  const jsonPath = 'C:/Users/painl/.gemini/antigravity-ide/brain/7e4e1b45-7d2e-446a-b79f-90c2da33d904/scratch/typingmitra_all_scraped_passages.json';
  if (!fs.existsSync(jsonPath)) {
    console.error(`File not found: ${jsonPath}`);
    process.exit(1);
  }

  const passages = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`Loaded ${passages.length} passages to import into the Mock Test Database.`);

  const existingCategories = await prisma.typingCategory.findMany();
  console.log(`Found ${existingCategories.length} existing categories in DB.`);
  const categoryMap = new Map(existingCategories.map(c => [c.id, c]));

  let importedCount = 0;

  for (const p of passages) {
    let catId = p.categoryId;
    
    // Check if category exists or map to closest
    if (!categoryMap.has(catId)) {
      const matched = existingCategories.find(c => 
        c.name.toLowerCase().includes(p.categoryName.toLowerCase().split(' ')[0]) ||
        p.categoryName.toLowerCase().includes(c.name.toLowerCase().split(' ')[0])
      );
      if (matched) {
        catId = matched.id;
      } else if (existingCategories.length > 0) {
        catId = existingCategories[0].id;
      }
    }

    try {
      await prisma.typingTest.upsert({
        where: { id: p.id },
        update: {
          title: p.title,
          categoryId: catId,
          passageText: p.passageText,
          demoPassageText: p.demoPassageText,
          mainDurationMinutes: p.mainDurationMinutes || 10,
          demoDurationMinutes: 1,
          breakDurationMinutes: 1,
          qualifyingWpm: p.qualifyingWpm || 35,
          maxErrorPercentage: p.maxErrorPercentage || 5.0,
          backspaceRule: 'ALLOWED',
          enableBackspace: true,
          allowRetype: false,
          highlightAllowed: true,
          language: p.language || 'en',
          difficulty: p.difficulty || 'Medium',
          isActive: true
        },
        create: {
          id: p.id,
          title: p.title,
          categoryId: catId,
          passageText: p.passageText,
          demoPassageText: p.demoPassageText,
          mainDurationMinutes: p.mainDurationMinutes || 10,
          demoDurationMinutes: 1,
          breakDurationMinutes: 1,
          qualifyingWpm: p.qualifyingWpm || 35,
          maxErrorPercentage: p.maxErrorPercentage || 5.0,
          backspaceRule: 'ALLOWED',
          enableBackspace: true,
          allowRetype: false,
          highlightAllowed: true,
          language: p.language || 'en',
          difficulty: p.difficulty || 'Medium',
          isActive: true,
          orderIndex: p.orderIndex || 1
        }
      });
      importedCount++;
      console.log(`[${importedCount}/${passages.length}] Imported "${p.title}" into Category: ${catId}`);
    } catch (err) {
      console.error(`Error importing ${p.id}:`, err.message);
    }
  }

  console.log(`\n==========================================================`);
  console.log(`🎉 SUCCESS: ${importedCount} passages imported into the Database!`);
  console.log(`==========================================================`);
}

importPassages()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
