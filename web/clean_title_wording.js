const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envFiles = [path.join(__dirname, '.env.local'), path.join(__dirname, '.env')];
  for (const f of envFiles) {
    if (fs.existsSync(f)) {
      const lines = fs.readFileSync(f, 'utf8').split('\n');
      for (const l of lines) {
        const trimmed = l.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const idx = trimmed.indexOf('=');
          if (idx !== -1) {
            const key = trimmed.slice(0, idx).trim();
            let val = trimmed.slice(idx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
            if (!process.env[key]) process.env[key] = val;
          }
        }
      }
    }
  }
}
loadEnv();

const { PrismaClient } = require('./node_modules/@prisma/client');
const { PrismaPg } = require('./node_modules/@prisma/adapter-pg');
const { Pool } = require('./node_modules/pg');

const connectionString = (process.env.TYPING_DATABASE_URL || process.env.DATABASE_URL || '').trim();
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function cleanDuplicateTypingWords() {
  const allTests = await prisma.typingTest.findMany({
    select: { id: true, title: true }
  });

  for (const t of allTests) {
    if (t.title.includes('Typing Typing') || t.title.includes('TYPING Typing') || t.title.includes('Typing typing')) {
      const clean = t.title
        .replace(/Typing Typing/gi, 'Typing')
        .replace(/\s+/g, ' ')
        .trim();
      await prisma.typingTest.update({
        where: { id: t.id },
        data: { title: clean }
      });
    }
  }
  console.log("✅ Duplicate 'Typing' wording cleaned across all titles!");
}

cleanDuplicateTypingWords().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
