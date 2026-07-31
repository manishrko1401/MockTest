const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlLine = envContent.split('\n').find(line => line.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine ? dbUrlLine.split('DATABASE_URL=')[1].replace(/"/g, '').trim() : null;

if (!dbUrl) {
  console.error("DATABASE_URL not found in .env file.");
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Resetting referral data across all users in database...");

  const result = await prisma.user.updateMany({
    data: {
      referredBy: null,
      referralsCount: 0,
      referralCoinsCredited: false,
      coins: 0
    }
  });

  console.log(`Successfully reset referral data for ${result.count} users.`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch(err => {
  console.error("Error resetting referrals:", err);
  process.exit(1);
});
