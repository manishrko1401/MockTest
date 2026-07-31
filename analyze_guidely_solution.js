const fs = require('fs');
const path = require('path');

const mainJs = fs.readFileSync(path.join(__dirname, 'Guidely_files', 'main-es2015.e3fba3a32dea0e6cb9c6.js.download'), 'utf8');

let pos = 0;
while (true) {
  const idx = mainJs.indexOf('getNew', pos);
  if (idx === -1) break;
  console.log(`\n--- getNew snippet at ${idx} ---`);
  console.log(mainJs.substring(idx - 50, idx + 250));
  pos = idx + 6;
  if (pos > 500000) break;
}
