const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Usage:
// 1. node init_typing_db.js "postgresql://postgres:PASSWORD@HOST:5432/postgres"
// 2. Or configure TYPING_DATABASE_URL / TYPING_DIRECT_URL in web/.env and run: node init_typing_db.js

const envPath = path.join(__dirname, '.env');
const envVars = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const idx = line.indexOf('=');
    if (idx > 0) envVars[line.slice(0, idx).trim()] = line.slice(idx + 1).replace(/"/g, '').trim();
  });
}

const targetConnStr = process.argv[2] || envVars.TYPING_DIRECT_URL || envVars.TYPING_DATABASE_URL;

if (!targetConnStr) {
  console.error('❌ Error: Please provide the target database connection string or set TYPING_DATABASE_URL in web/.env.');
  console.error('Usage: node init_typing_db.js "postgresql://postgres:PASSWORD@HOST:5432/postgres"');
  process.exit(1);
}

const pool = new Pool({
  connectionString: targetConnStr,
  ssl: { rejectUnauthorized: false },
  max: 5
});

async function initTypingDb() {
  console.log('==================================================');
  console.log('🚀 INITIALIZING SEPARATE TYPING TEST SUPABASE DB');
  console.log('Target host:', targetConnStr.split('@')[1] ? targetConnStr.split('@')[1].split('/')[0] : 'target');
  console.log('==================================================\n');

  const client = await pool.connect();

  try {
    console.log('1. Creating tables in separate Supabase instance...');

    // 1. typing_categories
    await client.query(`
      CREATE TABLE IF NOT EXISTS typing_categories (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        "nameHi" TEXT DEFAULT '',
        description TEXT DEFAULT '',
        icon TEXT DEFAULT 'Keyboard',
        "logoUrl" TEXT DEFAULT '',
        "orderIndex" INT DEFAULT 0,
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('   ✅ Table [typing_categories] verified/created');

    // 2. typing_tests
    await client.query(`
      CREATE TABLE IF NOT EXISTS typing_tests (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        "titleHi" TEXT DEFAULT '',
        "categoryId" TEXT NOT NULL REFERENCES typing_categories(id) ON DELETE CASCADE,
        "passageId" TEXT DEFAULT '',
        "passageText" TEXT DEFAULT '',
        "demoPassageText" TEXT DEFAULT '',
        "demoDurationMinutes" FLOAT DEFAULT 1,
        "breakDurationMinutes" FLOAT DEFAULT 1,
        "mainDurationMinutes" FLOAT DEFAULT 10,
        "qualifyingWpm" FLOAT DEFAULT 35,
        "maxErrorPercentage" FLOAT DEFAULT 5,
        "backspaceRule" TEXT DEFAULT 'ALLOWED',
        "enableBackspace" BOOLEAN DEFAULT true,
        "allowRetype" BOOLEAN DEFAULT false,
        "highlightAllowed" BOOLEAN DEFAULT false,
        language TEXT DEFAULT 'en',
        difficulty TEXT DEFAULT 'Medium',
        instructions TEXT DEFAULT '',
        "orderIndex" INT DEFAULT 0,
        "isActive" BOOLEAN DEFAULT true,
        "totalAttempts" INT DEFAULT 0,
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS "typing_tests_categoryId_idx" ON typing_tests("categoryId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "typing_tests_language_idx" ON typing_tests(language);`);
    console.log('   ✅ Table [typing_tests] and indexes verified/created');

    // 3. typing_attempts
    await client.query(`
      CREATE TABLE IF NOT EXISTS typing_attempts (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" TEXT DEFAULT 'guest',
        "userName" TEXT DEFAULT 'Student',
        "testId" TEXT NOT NULL REFERENCES typing_tests(id) ON DELETE CASCADE,
        "testTitle" TEXT DEFAULT '',
        "categoryName" TEXT DEFAULT '',
        "grossWpm" FLOAT DEFAULT 0,
        "netWpm" FLOAT DEFAULT 0,
        "accuracyPercentage" FLOAT DEFAULT 0,
        "totalKeystrokes" INT DEFAULT 0,
        "correctKeystrokes" INT DEFAULT 0,
        "errorKeystrokes" INT DEFAULT 0,
        "fullMistakes" INT DEFAULT 0,
        "halfMistakes" INT DEFAULT 0,
        "totalMistakes" INT DEFAULT 0,
        "errorPercentage" FLOAT DEFAULT 0,
        "backspaceCount" INT DEFAULT 0,
        "timeSpentSeconds" INT DEFAULT 0,
        "allocatedTimeSeconds" INT DEFAULT 0,
        "isQualified" BOOLEAN DEFAULT false,
        language TEXT DEFAULT 'en',
        "typedText" TEXT DEFAULT '',
        "targetText" TEXT DEFAULT '',
        "allowRetype" BOOLEAN,
        "retypeCycles" INT,
        "detailedMistakes" JSONB,
        "completedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS "typing_attempts_userId_idx" ON typing_attempts("userId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "typing_attempts_testId_idx" ON typing_attempts("testId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "typing_attempts_completedAt_idx" ON typing_attempts("completedAt");`);
    console.log('   ✅ Table [typing_attempts] and indexes verified/created');

    // Check if categories already exist
    const catCheck = await client.query('SELECT COUNT(*) FROM typing_categories');
    const existingCount = parseInt(catCheck.rows[0].count, 10);

    if (existingCount === 0) {
      console.log('\n2. Target database has 0 typing categories. Checking primary DB for migration data...');
      if (envVars.DATABASE_URL) {
        const sourcePool = new Pool({ connectionString: envVars.DATABASE_URL, ssl: { rejectUnauthorized: false } });
        try {
          const srcCats = await sourcePool.query('SELECT * FROM typing_categories');
          const srcTests = await sourcePool.query('SELECT * FROM typing_tests');

          if (srcCats.rows.length > 0) {
            console.log(`   Migrating ${srcCats.rows.length} categories from primary database...`);
            for (const cat of srcCats.rows) {
              await client.query(`
                INSERT INTO typing_categories (id, name, "nameHi", description, icon, "logoUrl", "orderIndex", "isActive", "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (id) DO NOTHING
              `, [cat.id, cat.name, cat.nameHi, cat.description, cat.icon, cat.logoUrl, cat.orderIndex, cat.isActive, cat.createdAt, cat.updatedAt]);
            }
          }

          if (srcTests.rows.length > 0) {
            console.log(`   Migrating ${srcTests.rows.length} typing tests from primary database...`);
            for (const t of srcTests.rows) {
              await client.query(`
                INSERT INTO typing_tests (id, title, "titleHi", "categoryId", "passageId", "passageText", "demoPassageText", "demoDurationMinutes", "breakDurationMinutes", "mainDurationMinutes", "qualifyingWpm", "maxErrorPercentage", "backspaceRule", "enableBackspace", "allowRetype", "highlightAllowed", language, difficulty, instructions, "orderIndex", "isActive", "totalAttempts", "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
                ON CONFLICT (id) DO NOTHING
              `, [
                t.id, t.title, t.titleHi, t.categoryId, t.passageId, t.passageText, t.demoPassageText,
                t.demoDurationMinutes, t.breakDurationMinutes, t.mainDurationMinutes, t.qualifyingWpm,
                t.maxErrorPercentage, t.backspaceRule, t.enableBackspace, t.allowRetype, t.highlightAllowed,
                t.language, t.difficulty, t.instructions, t.orderIndex, t.isActive, t.totalAttempts,
                t.createdAt, t.updatedAt
              ]);
            }
          }
          console.log('   ✅ Seed data copied successfully!');
        } catch (srcErr) {
          console.warn('   Could not read from primary database, seeding standard defaults instead:', srcErr.message);
        } finally {
          await sourcePool.end();
        }
      }
    } else {
      console.log(`\n2. Target database already has ${existingCount} typing categories.`);
    }

    console.log('\n==================================================');
    console.log('🎉 SEPARATE TYPING SUPABASE DATABASE INITIALIZED SUCCESSFULLY!');
    console.log('==================================================');

  } catch (err) {
    console.error('\n❌ Initialization failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

initTypingDb();
