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

async function verifySavedNotice() {
  const notice = await prisma.notice.findFirst({
    where: {
      contentHtml: { not: null }
    }
  });

  if (!notice) {
    console.log("No notice found with contentHtml");
  } else {
    console.log("Found Notice with contentHtml!");
    console.log("ID:", notice.id);
    console.log("Title:", notice.title);
    console.log("Raw URL:", notice.rawUrl);
    console.log("Content HTML Length:", notice.contentHtml.length);
    console.log("---------------- CONTENT HTML START ----------------\n", notice.contentHtml.substring(0, 350));
    console.log("---------------- CONTENT HTML END ----------------\n", notice.contentHtml.substring(notice.contentHtml.length - 350));
  }

  await prisma.$disconnect();
}

verifySavedNotice();
