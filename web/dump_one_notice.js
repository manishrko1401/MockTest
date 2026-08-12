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

async function dumpOne() {
  const notice = await prisma.notice.findFirst({
    where: { category: 'notice', contentHtml: { not: null } }
  });

  if (notice) {
    console.log(`Title: ${notice.title}`);
    console.log(`HTML Length: ${notice.contentHtml.length}`);
    fs.writeFileSync(path.join(__dirname, 'sample_dump.html'), notice.contentHtml);
    console.log('Saved to sample_dump.html');
  }
  await prisma.$disconnect();
}

dumpOne();
