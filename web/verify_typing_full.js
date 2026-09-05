const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) envVars[line.slice(0, idx).trim()] = line.slice(idx + 1).replace(/"/g, '').trim();
});

const pool = new Pool({
  connectionString: envVars.TYPING_DIRECT_URL || envVars.TYPING_DATABASE_URL || envVars.DIRECT_URL || envVars.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verify() {
  const client = await pool.connect();
  try {
    const catRes = await client.query('SELECT count(*) as count FROM typing_categories');
    console.log('✅ Total typing categories in DB:', catRes.rows[0].count);

    const testRes = await client.query('SELECT count(*) as count FROM typing_tests');
    console.log('✅ Total typing tests in DB:', testRes.rows[0].count);

    const sampleCats = await client.query('SELECT id, name, "logoUrl" FROM typing_categories ORDER BY "orderIndex" ASC LIMIT 10');
    console.log('\nTop 10 categories:');
    sampleCats.rows.forEach(r => {
      console.log(` - [${r.id}] ${r.name} -> logo: ${r.logoUrl}`);
    });

    const sampleTests = await client.query('SELECT id, title, "categoryId", difficulty, language, "mainDurationMinutes" FROM typing_tests LIMIT 5');
    console.log('\nSample tests:');
    sampleTests.rows.forEach(r => {
      console.log(` - [${r.id}] ${r.title} (${r.difficulty}, ${r.language}, ${r.mainDurationMinutes}m)`);
    });
  } finally {
    client.release();
    await pool.end();
  }
}

verify().catch(console.error);
