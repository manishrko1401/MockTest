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

async function verifyBrandingAndTables() {
  const notices = await prisma.notice.findMany({
    where: { contentHtml: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log(`Checking ${notices.length} notices in DB:\n`);
  for (const n of notices) {
    const html = n.contentHtml || '';
    const hasRojgarBranding = /rojgarresult/i.test(html) || /Rojgar\s*Result/i.test(html);
    const tableCount = (html.match(/<table/gi) || []).length;
    console.log(`Notice ID: ${n.id}`);
    console.log(`Title: ${n.title}`);
    console.log(`Content HTML length: ${html.length} chars | Table count: ${tableCount}`);
    console.log(`Has Rojgar Result branding: ${hasRojgarBranding ? 'YES (FAIL)' : 'NO (CLEAN)'}`);
    console.log('---');
  }

  await prisma.$disconnect();
}

verifyBrandingAndTables();
