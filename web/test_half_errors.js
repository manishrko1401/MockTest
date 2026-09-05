const { evaluateTyping } = require('../web/app/lib/typingTypes.ts');

const passage = 'In the year 2025,a very big and beautiful change has come to the public libraries across India.For a long time,many libraries were just old buildings.';

const cfg = { id: 'x', title: 'SSC CHSL Passage 1', slug: 'ssc-chsl' };
const run = (typed, label) => {
  const r = evaluateTyping(passage, typed, 10, 0, 35, 7, false, cfg, false, true, false, 'en', 'UR');
  console.log(`\n=== ${label} ===`);
  console.log(`  Typed: "${typed.trim()}"`);
  console.log(`  full=${r.fullMistakes}, half=${r.halfMistakes}, cap=${r.wrongCapitalizations}, punct=${r.punctuationErrors}, spacing=${r.spacingErrors}, transpos=${r.transpositionErrors}`);
};

// Capitalization
run('In The Year 2025,a very big and beautiful change has come', 'Capitalization: "The Year" instead of "the year"');

// Split word (passage "2025,a" → typed "2025, a" as two words)
run('In the year 2025, a very big and beautiful change has come', 'Split: "2025,a" → "2025, a"');

// Split word (passage "India.For" → typed "India. For" as two words)
run('In the year 2025,a very big and beautiful change has come to the public libraries across India. For a long time,many', 'Split: "India.For" → "India. For"');

// Joined words (if passage had separate words, user types joined - using different passage)
const passage2 = 'In the year 2025 a very big change has come.';
const cfgx = { id: 'x', title: 'SSC CHSL Passage 1', slug: 'ssc-chsl' };
const r2 = evaluateTyping(passage2, 'In the year 2025a very big change has come.', 10, 0, 35, 7, false, cfgx, false, true, false, 'en', 'UR');
console.log('\n=== Joined: "2025 a" → "2025a" ===');
console.log(`  full=${r2.fullMistakes}, half=${r2.halfMistakes}, spacing=${r2.spacingErrors}`);

// Transposition
run('In the year 2025,a very and big beautiful change has come', 'Transposition: "and big" instead of "big and"');

// Punctuation  
run('In the year 2025 a very big and beautiful change has come', 'Punctuation: "2025" instead of "2025,a"');
