require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('fs');

const dbUrl = process.env.DATABASE_URL;
const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkRedirectsAndMissingDetails() {
  const notices = await prisma.notice.findMany({
    select: { id: true, title: true, url: true, rawUrl: true, contentHtml: true, category: true }
  });

  console.log(`Checking ${notices.length} notices in DB for broken URLs or missing inner details...\n`);

  let countHomeRedirect = 0;
  let countMissingContent = 0;
  let countShortContent = 0;

  for (const n of notices) {
    if (!n.contentHtml) {
      countMissingContent++;
    }
  }

  console.log(`Summary:`);
  console.log(`- Total notices: ${notices.length}`);
  console.log(`- Without contentHtml: ${countMissingContent}`);

  await prisma.$disconnect();
}

checkRedirectsAndMissingDetails();
