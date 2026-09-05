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

const { Pool } = require('./node_modules/pg');
const pool = new Pool({ connectionString: (process.env.TYPING_DATABASE_URL || process.env.DATABASE_URL || '').trim() });

async function main() {
  // Get typing_tests columns
  const cols = await pool.query(`
    SELECT column_name, data_type, character_maximum_length, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'typing_tests'
    ORDER BY ordinal_position
  `);
  console.log('typing_tests columns:');
  for (const c of cols.rows) {
    console.log(`  ${c.column_name} (${c.data_type}) nullable=${c.is_nullable} default=${c.column_default}`);
  }
  
  // Check typing_categories
  const cats = await pool.query('SELECT id, name FROM typing_categories ORDER BY "orderIndex" LIMIT 50');
  console.log(`\nCategories in DB (${cats.rows.length}):`);
  for (const c of cats.rows) console.log(`  ${c.id} → ${c.name}`);
  
  await pool.end();
}
main().catch(console.error);
