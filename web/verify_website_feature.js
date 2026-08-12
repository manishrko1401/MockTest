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

async function verifyWebsiteFeature() {
  console.log("=================================================");
  console.log("   VERIFYING NOTICE INNER DETAILS FEATURE");
  console.log("=================================================\n");

  const categories = ['notice', 'result', 'admit_card', 'answer_key'];

  for (const cat of categories) {
    const totalInCat = await prisma.notice.count({ where: { category: cat } });
    const withContent = await prisma.notice.count({
      where: {
        category: cat,
        contentHtml: { not: null }
      }
    });

    console.log(`Category [${cat.toUpperCase()}]:`);
    console.log(`  Total records: ${totalInCat}`);
    console.log(`  With inner contentHtml: ${withContent}`);

    const sample = await prisma.notice.findFirst({
      where: {
        category: cat,
        contentHtml: { not: null }
      }
    });

    if (sample) {
      console.log(`  Sample Title: "${sample.title.substring(0, 60)}..."`);
      console.log(`  Raw URL: ${sample.rawUrl}`);
      console.log(`  Direct URL: ${sample.url}`);
      console.log(`  Content HTML Length: ${sample.contentHtml.length} characters`);
      const hasHeading = sample.contentHtml.includes('entry-title') || sample.contentHtml.includes('<h1');
      const hasLinksTable = sample.contentHtml.toLowerCase().includes('links');
      console.log(`  Contains Notice Heading: ${hasHeading ? '✅ YES' : '❌ NO'}`);
      console.log(`  Contains Links Table: ${hasLinksTable ? '✅ YES' : '❌ NO'}`);
    } else {
      console.log(`  ❌ No sample notice found with contentHtml in category ${cat}`);
    }
    console.log('-------------------------------------------------');
  }

  await prisma.$disconnect();
}

verifyWebsiteFeature();
