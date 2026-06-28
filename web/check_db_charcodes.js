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

async function main() {
  const tests = await prisma.mockTest.findMany();
  for (const test of tests) {
    if (test.customQuestions) {
      const qs = test.customQuestions;
      for (const q of qs) {
        if (q.textEn && q.textEn.includes('satisfying equation')) {
          console.log(`--- Test: ${test.title} ---`);
          const text = q.textEn;
          console.log("textEn:", text);
          // Print characters and their codes around the first tag
          const index = text.indexOf('equation:') + 'equation:'.length;
          const segment = text.substring(index, index + 30);
          console.log("Segment after 'equation:':", JSON.stringify(segment));
          for (let i = 0; i < segment.length; i++) {
            console.log(`Char at ${i}: '${segment[i]}' (code: ${segment.charCodeAt(i)})`);
          }
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
