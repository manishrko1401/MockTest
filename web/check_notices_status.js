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

async function checkNotices() {
  const total = await prisma.notice.count();
  const withContent = await prisma.notice.count({
    where: { contentHtml: { not: null } }
  });
  const withoutContent = await prisma.notice.count({
    where: { contentHtml: null }
  });

  console.log(`Total notices in DB: ${total}`);
  console.log(`With contentHtml: ${withContent}`);
  console.log(`Without contentHtml: ${withoutContent}`);

  const sampleWithout = await prisma.notice.findMany({
    where: { contentHtml: null },
    take: 5,
    select: { id: true, title: true, url: true, rawUrl: true }
  });

  console.log("Sample without contentHtml:", sampleWithout);

  await prisma.$disconnect();
}

checkNotices();
