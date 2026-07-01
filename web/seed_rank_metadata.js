const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Manually load .env file
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlLine = envContent.split('\n').find(line => line.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine ? dbUrlLine.split('DATABASE_URL=')[1].replace(/"/g, '').trim() : null;

if (!dbUrl) {
  console.error("DATABASE_URL not found in .env file.");
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding Mock Tests with Testbook statistical parameters...");

  const mockTests = await prisma.mockTest.findMany();
  console.log(`Found ${mockTests.length} mock test(s) to update.`);

  for (const test of mockTests) {
    // Determine maxMarks (default to 200 if not set)
    const maxMarks = test.maxMarks || 200;

    // Generate realistic Stats:
    // Topper score = ~85-94% of max marks
    // Average score = ~40-48% of max marks
    // Cutoff score = ~52-58% of max marks
    // Total users = ~10,000 to 25,000
    const testbookTotalUsers = Math.floor(10000 + Math.random() * 15000);
    const testbookTopperScore = Number((maxMarks * (0.85 + Math.random() * 0.09)).toFixed(1));
    const testbookAverageScore = Number((maxMarks * (0.40 + Math.random() * 0.08)).toFixed(1));
    const testbookCutoffScore = Number((maxMarks * (0.52 + Math.random() * 0.06)).toFixed(1));

    await prisma.mockTest.update({
      where: { id: test.id },
      data: {
        testbookTotalUsers,
        testbookTopperScore,
        testbookAverageScore,
        testbookCutoffScore,
      }
    });

    console.log(`Updated "${test.title}":`);
    console.log(` - Total Users: ${testbookTotalUsers}`);
    console.log(` - Topper Score: ${testbookTopperScore} / ${maxMarks}`);
    console.log(` - Average Score: ${testbookAverageScore} / ${maxMarks}`);
    console.log(` - Cutoff Score: ${testbookCutoffScore} / ${maxMarks}\n`);
  }

  console.log("Seeding completed successfully.");
}

main()
  .catch(e => console.error("Error seeding stats:", e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
