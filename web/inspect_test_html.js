const fs = require('fs');
const html = fs.readFileSync('test_page_sample.html', 'utf8');

// Find the z6 div content
const z6Start = html.indexOf('id="z6"');
if (z6Start !== -1) {
  const snippet = html.slice(z6Start - 50, z6Start + 2000);
  console.log('=== Z6 div context ===');
  console.log(snippet);
}

// Look for any script that sets innerHTML or text content with passage
const scriptMatches = [...html.matchAll(/z6\.innerHTML\s*=\s*["'`]([^"'`]{20,})/gi)];
console.log('\n=== z6.innerHTML assignments ===');
for (const m of scriptMatches) console.log(m[1].slice(0, 200));

// Look for passage in data variables
const varMatches = [...html.matchAll(/(?:passage|text|content)\s*[:=]\s*["'`]([^"'`]{100,})/gi)];
console.log('\n=== passage variable assignments ===');
for (const m of varMatches.slice(0,5)) console.log(m[1].slice(0, 200));

// Try JSON data embedded
const jsonMatches = [...html.matchAll(/\{[^{}]*["'](?:passage|text|content)["'][^{}]*\}/gi)];
console.log('\n=== JSON-like objects with passage ===');
for (const m of jsonMatches.slice(0,5)) console.log(m[0].slice(0, 300));

// Look for var/const assignments with long strings
const longVarMatches = [...html.matchAll(/(?:var|let|const)\s+\w+\s*=\s*["'`]([A-Za-z\s,.']{150,})/g)];
console.log('\n=== Long string variable assignments ===');
for (const m of longVarMatches.slice(0,5)) console.log(m[1].slice(0, 300));
