// Copies the website's shared logic into the app (src/shared), so the app scores tests,
// builds exam sessions and checks typing speed exactly like the website.
//   npm run sync-shared      (run after changing these files in web/app/lib)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const web = path.join(root, '..', 'web', 'app');
const out = path.join(root, 'src', 'shared');
const HEADER = '// AUTO-COPIED from the website by scripts/sync-shared.mjs. Edit the website file, then run npm run sync-shared.\n';

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

/** Pulls `export interface/type Name ...` blocks out of a file (brace matching). */
function extract(file, names) {
  const src = fs.readFileSync(path.join(web, file), 'utf8');
  return names.map((name) => {
    const m = new RegExp(`export (interface|type) ${name}\\b`).exec(src);
    if (!m) throw new Error(`${name} not found in ${file}`);
    let i = m.index;
    if (m[1] === 'type') {
      const end = src.indexOf(';\n', i);
      return src.slice(i, end + 1);
    }
    let depth = 0, j = src.indexOf('{', i);
    for (; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}' && --depth === 0) break;
    }
    return src.slice(i, j + 1);
  }).join('\n\n');
}

const types = [
  extract('useTestEngine.tsx', ['OptionContent', 'QuestionContent', 'Question', 'Section', 'ActiveSession', 'PaletteState', 'QuestionResponse']),
  extract('AuthContext.tsx', ['MockTestItem', 'TestSubSubCategory', 'TestSubCategory', 'TestCategory', 'MockTestRecord', 'Notice', 'TrackedJob', 'MockUser']),
].join('\n\n');
fs.writeFileSync(path.join(out, 'webTypes.ts'), `${HEADER}/* eslint-disable */\n${types}\n`);

const fixImports = (code) => code
  .replace(/from ['"]\.\.\/useTestEngine['"]/g, "from './webTypes'")
  .replace(/from ['"]\.\.\/AuthContext['"]/g, "from './webTypes'");

const files = ['examUtils.ts', 'examShuffle.ts', 'liveTestShared.ts', 'examScoring.ts','mathUtils.ts', 'markingUtils.ts', 'plannerShared.ts', 'syllabusTemplates.ts', 'typingTypes.ts'];
for (const f of files) {
  fs.writeFileSync(path.join(out, f), HEADER + fixImports(fs.readFileSync(path.join(web, 'lib', f), 'utf8')));
}

// CBAT (RRB NTPC psycho test): builds the five batteries from the uploaded questions
fs.writeFileSync(path.join(out, 'cbatData.ts'), HEADER + fs.readFileSync(path.join(web, 'exam', '[id]', 'cbatData.ts'), 'utf8'));

// Exam engine (timers, palette states, sections, RPSC extra time): the website's own reducer.
// The website's React provider below it uses browser events, so the app has its own.
{
  const src = fs.readFileSync(path.join(web, 'useTestEngine.tsx'), 'utf8');
  const cut = src.indexOf('// CONTEXT PROVIDER SETUP');
  if (cut < 0) throw new Error('useTestEngine.tsx layout changed');
  let engine = src.slice(0, src.lastIndexOf('// ====', cut));
  engine = engine
    .replace(/^import React[^\n]*\n/m, '')
    .replace("from './lib/examScoring'", "from './examScoring'")
    .replace(/export interface (OptionContent|QuestionContent|Question|Section|ActiveSession|QuestionResponse) \{[\s\S]*?\n\}\n/g, '')
    .replace(/export type PaletteState[^\n]*\n/, '');
  engine = "import type { OptionContent, QuestionContent, Question, Section, ActiveSession, PaletteState, QuestionResponse } from './webTypes';\n" + engine;
  engine += '\nexport { engineReducer, getSectionQuestions };\nexport type { EngineAction };\n';
  fs.writeFileSync(path.join(out, 'examEngine.ts'), HEADER + engine);
}

// Typing engine (all exams' official rules)
const copyDir = (from, to) => {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) copyDir(a, b);
    else fs.writeFileSync(b, HEADER + fixImports(fs.readFileSync(a, 'utf8')));
  }
};
copyDir(path.join(web, 'lib', 'typing'), path.join(out, 'typing'));
console.log('Shared logic copied to src/shared');
