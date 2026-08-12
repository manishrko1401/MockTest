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

async function checkHowToApplyStructures() {
  const notices = await prisma.notice.findMany({ take: 50 });
  let count = 0;
  
  for (const n of notices) {
    if (!n.contentHtml) continue;
    const idx = n.contentHtml.toLowerCase().indexOf('how to apply');
    if (idx !== -1) {
      count++;
      console.log(`Notice [${n.id}]: ${n.title.substring(0, 50)}`);
      const snippet = n.contentHtml.substring(idx, idx + 600);
      const hasUl = /<ul>/i.test(snippet);
      const hasOl = /<ol>/i.test(snippet);
      const hasLi = /<li>/i.test(snippet);
      console.log(`  -> hasUl: ${hasUl}, hasOl: ${hasOl}, hasLi: ${hasLi}`);
      if (!hasUl && !hasOl && !hasLi) {
        console.log('  -> NON-LIST FORMAT SNIPPET:', snippet.substring(0, 300));
      }
    }
  }
  
  console.log(`Total checked: ${count}`);
  await prisma.$disconnect();
}

checkHowToApplyStructures();
