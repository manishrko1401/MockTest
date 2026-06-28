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

function decodeHtml(text) {
  if (!text) return "";
  let decoded = text;
  for (let i = 0; i < 3; i++) {
    const temp = decoded
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
    if (temp === decoded) break;
    decoded = temp;
  }
  return decoded;
}

async function main() {
  const tests = await prisma.mockTest.findMany();
  for (const test of tests) {
    if (test.customQuestions) {
      const qs = test.customQuestions;
      for (const q of qs) {
        if (q.textEn && q.textEn.includes('satisfying equation')) {
          console.log(`--- Test: ${test.title} ---`);
          console.log("raw textEn:  ", JSON.stringify(q.textEn));
          console.log("decoded once:", JSON.stringify(decodeHtml(q.textEn)));
        }
        if (q.textEn && q.textEn.includes('Find the value of') && q.textEn.includes('tan 30')) {
          console.log(`--- Test: ${test.title} ---`);
          console.log("raw textEn:  ", JSON.stringify(q.textEn));
          console.log("decoded once:", JSON.stringify(decodeHtml(q.textEn)));
        }
      }
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
