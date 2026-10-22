// Applies schema.prisma to the database without deleting anything.
//
// Several tables are created by the app itself with raw SQL (login sessions, study planner,
// With Friends, rate limits, password resets, locker unlocks…) and are not in schema.prisma.
// A plain `prisma db push` would DROP them, with all their data. This script asks Prisma for
// the SQL, leaves those tables alone, stops if anything else would be dropped, and runs the rest.
//
//   npm run db:push
import { execSync } from 'node:child_process';

// Tables the app creates and manages itself (CREATE TABLE IF NOT EXISTS in app/lib, app/api)
const APP_TABLES = [
  'auth_sessions', 'admin_push_devices', 'user_tours', 'rate_events', 'password_resets', 'locker_unlocks', 'attempt_integrity', 'user_platforms', 'user_notifications', 'user_push_devices', 'user_notify_prefs',
  'study_tasks', 'study_task_checkins', 'study_targets', 'study_exams', 'study_syllabi',
  'friend_rooms', 'friend_room_members', 'friend_room_messages', 'friend_links', 'friend_messages', 'friend_codes',
];

const run = (cmd, input) => execSync(cmd, { encoding: 'utf8', input, stdio: [input ? 'pipe' : 'ignore', 'pipe', 'pipe'] });

let diff;
try {
  diff = run('npx prisma migrate diff --from-config-datasource --to-schema schema.prisma --script');
} catch (err) {
  console.error('Could not compare the schema with the database:\n', err.stderr || err.message);
  process.exit(1);
}

const statements = diff
  .split(/;\s*\n/)
  .map((st) => st.split('\n').filter((line) => !line.trim().startsWith('--')).join('\n').trim())
  .filter(Boolean);

const touchesAppTable = (st) => APP_TABLES.some((t) => new RegExp(`^(DROP TABLE|ALTER TABLE)\\s+"${t}"`, 'i').test(st));
const kept = statements.filter((st) => !touchesAppTable(st));
const drops = kept.filter((st) => /\bDROP\s+(TABLE|COLUMN|INDEX|TYPE|SCHEMA)\b/i.test(st) || /\bDROP\s+COLUMN\b/i.test(st));

if (drops.length) {
  console.error('Stopped: this change would delete data from the database:\n');
  for (const st of drops) console.error('  ' + st.replace(/\s+/g, ' ').slice(0, 200));
  console.error('\nCheck schema.prisma, or apply the change by hand with SQL.');
  process.exit(1);
}
if (!kept.length) {
  console.log('Database already matches schema.prisma. Nothing to do.');
  process.exit(0);
}

console.log('Applying:\n' + kept.map((st) => '  ' + st.replace(/\s+/g, ' ').slice(0, 200)).join('\n'));
try {
  run('npx prisma db execute --stdin', kept.join(';\n') + ';\n');
  run('npx prisma generate --schema=./schema.prisma');
  console.log('Done.');
} catch (err) {
  console.error('Failed:\n', err.stderr || err.message);
  process.exit(1);
}
