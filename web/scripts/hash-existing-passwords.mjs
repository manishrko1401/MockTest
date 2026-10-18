// One-time: replace every plain-text password in the users table with a scrypt hash.
//
// RUN THIS ONLY AFTER the new login code (app/lib/serverAuth.ts) is deployed to production.
// The old code compares plain text, so hashing earlier would lock everyone out of the live site.
//
//   cd web
//   node scripts/hash-existing-passwords.mjs            (dry run: only counts)
//   node scripts/hash-existing-passwords.mjs --apply    (hashes them)
//
// Same format as hashPassword() in app/lib/serverAuth.ts: "scrypt$<salt b64>$<hash b64>".
import fs from 'fs';
import crypto from 'crypto';
import pg from 'pg';

const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const apply = process.argv.includes('--apply');
const hash = (pw) => {
  const salt = crypto.randomBytes(16);
  return `scrypt$${salt.toString('base64')}$${crypto.scryptSync(pw, salt, 64).toString('base64')}`;
};

const client = new pg.Client({ connectionString: env.DIRECT_URL || env.DATABASE_URL });
await client.connect();
try {
  const { rows } = await client.query(`SELECT id, "passwordHash" FROM users WHERE "passwordHash" NOT LIKE 'scrypt$%'`);
  console.log(`${rows.length} account(s) still have a plain-text password.`);
  if (!apply) {
    console.log('Dry run — nothing changed. Re-run with --apply after the new code is live.');
  } else {
    let done = 0;
    for (const r of rows) {
      // Only touch the row if it still holds the same plain value (a login may have hashed it meanwhile)
      const res = await client.query(
        `UPDATE users SET "passwordHash" = $1 WHERE id = $2 AND "passwordHash" = $3`,
        [hash(r.passwordHash), r.id, r.passwordHash]
      );
      done += res.rowCount;
    }
    console.log(`Hashed ${done} password(s).`);
  }
} finally {
  await client.end();
}
