const path = require('path');
const fs = require('fs');

function loadEnv() {
  const envFiles = [path.join(__dirname, '.env.local'), path.join(__dirname, '.env')];
  for (const f of envFiles) {
    if (fs.existsSync(f)) {
      const lines = fs.readFileSync(f, 'utf8').split('\n');
      for (const l of lines) {
        const t = l.trim();
        if (t && !t.startsWith('#')) {
          const idx = t.indexOf('=');
          if (idx !== -1) {
            const key = t.slice(0, idx).trim();
            let val = t.slice(idx + 1).trim();
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

const ENGLISH_DEMO = `This is a demo typing test passage designed to check your keyboard responsiveness and warm up your fingers. Please ensure all letter keys, space bar, backspace, and punctuation marks like comma, period, and hyphens are functioning smoothly before you start the main examination.`;

const HINDI_DEMO = `यह एक डेमो टाइपिंग टेस्ट पैसेज है जिसे आपके कीबोर्ड की प्रतिक्रियाशीलता की जांच करने और आपकी उंगलियों को अभ्यास कराने के लिए बनाया गया है। मुख्य परीक्षा शुरू करने से पहले कृपया सुनिश्चित करें कि सभी अक्षर कुंजी, स्पेस बार, बैकस्पेस और अल्पविराम, पूर्णविराम और हाइफ़न जैसे विराम चिह्न सुचारू रूप से काम कर रहे हैं।`;

async function main() {
  // Update English tests
  const enResult = await pool.query(
    `UPDATE typing_tests SET "demoPassageText" = $1 WHERE language = 'en' OR language IS NULL`,
    [ENGLISH_DEMO]
  );
  console.log(`✅ English demo passage updated: ${enResult.rowCount} tests`);

  // Update Hindi tests
  const hiResult = await pool.query(
    `UPDATE typing_tests SET "demoPassageText" = $1 WHERE language = 'hi'`,
    [HINDI_DEMO]
  );
  console.log(`✅ Hindi demo passage updated:   ${hiResult.rowCount} tests`);

  // Verify
  const verify = await pool.query(`
    SELECT language, "demoPassageText", COUNT(*) as cnt
    FROM typing_tests
    GROUP BY language, "demoPassageText"
    ORDER BY language
  `);
  console.log('\n📊 Verification:');
  for (const r of verify.rows) {
    console.log(`  lang=${r.language} | count=${r.cnt} | demo="${r.demoPassageText.slice(0, 60)}..."`);
  }
}

main().catch(console.error).finally(() => pool.end());
