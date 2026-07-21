const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlLine = envContent.split('\n').find(line => line.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine ? dbUrlLine.split('DATABASE_URL=')[1].replace(/"/g, '').trim() : null;

const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function inspectAndFix() {
  const sessions = await prisma.userTestSession.findMany({
    select: {
      id: true,
      userId: true,
      mockTestId: true,
      timeSpentSeconds: true,
      responses: true,
      status: true,
    }
  });

  console.log(`Found ${sessions.length} total test session records.`);

  let updatedCount = 0;

  for (const s of sessions) {
    let exactTime = 0;
    if (s.responses) {
      if (Array.isArray(s.responses)) {
        exactTime = s.responses.reduce((sum, r) => sum + (r.elapsedSeconds || 0), 0);
      } else if (typeof s.responses === 'object') {
        exactTime = Object.values(s.responses).reduce((sum, r) => sum + (r?.elapsedSeconds || 0), 0);
      }
    }

    if (exactTime > 0 && exactTime !== s.timeSpentSeconds) {
      console.log(`Updating Session ${s.id} (Test: ${s.mockTestId}): old timeSpentSeconds = ${s.timeSpentSeconds}s (${Math.floor(s.timeSpentSeconds/60)}m), new exact = ${exactTime}s (${Math.floor(exactTime/60)}m ${exactTime%60}s)`);
      
      await prisma.userTestSession.update({
        where: { id: s.id },
        data: { timeSpentSeconds: exactTime }
      });
      updatedCount++;
    }
  }

  console.log(`Finished updating ${updatedCount} past session records with exact time spent.`);
}

inspectAndFix()
  .catch(err => console.error("Error updating attempts:", err))
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
