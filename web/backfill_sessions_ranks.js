const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Abramowitz and Stegun Normal CDF approximation helper
function calculateNormalCDF(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804 * Math.exp(-z * z / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - p : p;
}

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
  console.log("Starting backfill for existing UserTestSessions...");

  const sessions = await prisma.userTestSession.findMany({
    where: {
      status: { in: ['COMPLETED', 'AUTO_SUBMITTED'] },
    },
    include: {
      mockTest: true,
    }
  });

  console.log(`Found ${sessions.length} completed sessions to backfill.`);

  let updatedCount = 0;

  for (const session of sessions) {
    const test = session.mockTest;
    if (!test) {
      console.log(` - Skipping Session ID ${session.id}: MockTest relation not found.`);
      continue;
    }

    if (!test.testbookTotalUsers || test.testbookTotalUsers <= 0) {
      console.log(` - Skipping Session ID ${session.id}: MockTest "${test.title}" does not have Testbook statistical benchmarks.`);
      continue;
    }

    const N = test.testbookTotalUsers;
    const topper = test.testbookTopperScore;
    const avg = test.testbookAverageScore;
    const score = session.finalScore || 0;

    // Estimate standard deviation (minimum width 5.0)
    const sigma = Math.max(5.0, (topper - avg) / 2.0);
    const z = (score - avg) / sigma;

    const cdf = calculateNormalCDF(z);
    const testbookPercentile = Number((cdf * 100).toFixed(2));
    const testbookRank = Math.max(1, Math.min(N, Math.round((1 - cdf) * N)));

    await prisma.userTestSession.update({
      where: { id: session.id },
      data: {
        testbookRank,
        testbookPercentile
      }
    });

    console.log(`Updated Session ${session.id} for test "${test.title}":`);
    console.log(` - User Score: ${score}`);
    console.log(` - Testbook Rank: #${testbookRank} / ${N}`);
    console.log(` - Percentile: ${testbookPercentile}%\n`);
    updatedCount++;
  }

  console.log(`Backfill completed. Updated ${updatedCount} sessions.`);
}

main()
  .catch(e => console.error("Error running backfill:", e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
