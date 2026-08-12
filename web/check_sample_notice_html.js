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

async function checkSampleContent() {
  const notices = await prisma.notice.findMany({
    where: { contentHtml: { not: null } },
    take: 5
  });

  console.log(`Found ${notices.length} notices with contentHtml.`);
  for (const n of notices) {
    console.log(`\n=== ID: ${n.id} | Title: ${n.title} ===`);
    console.log(`Raw URL: ${n.rawUrl}`);
    console.log(`Content HTML length: ${n.contentHtml.length}`);
    console.log(`First 500 chars:\n${n.contentHtml.substring(0, 500)}`);
  }
  await prisma.$disconnect();
}

checkSampleContent();
