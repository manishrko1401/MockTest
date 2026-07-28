const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlLine = envContent.split('\n').find(line => line.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine ? dbUrlLine.split('DATABASE_URL=')[1].replace(/"/g, '').trim() : null;

const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkPracticeInCompiledCatalog() {
  const categories = await prisma.category.findMany({ orderBy: { orderIndex: 'asc' } });
  console.log(`Total categories in DB: ${categories.length}`);
  
  const practiceCats = categories.filter(c => c.isPracticeSeries || c.id.includes('practice'));
  console.log(`Practice categories count: ${practiceCats.length}`);
  
  practiceCats.forEach(c => {
    console.log(`- Practice Category: [${c.id}] "${c.name}" | Description: "${c.description}" | CountText: "${c.countText}"`);
  });
}

checkPracticeInCompiledCatalog()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
