const fs = require('fs');

const script2 = fs.readFileSync('scratch/script_2.js', 'utf-8');
let jsonStr = script2.trim();
if (jsonStr.startsWith('window.INITIAL_STATE =')) {
  jsonStr = jsonStr.replace(/^window\.INITIAL_STATE\s*=\s*/, '');
}
if (jsonStr.endsWith(';')) {
  jsonStr = jsonStr.slice(0, -1);
}

const data = JSON.parse(jsonStr);

console.log("=== test_portal key content ===");
console.log(JSON.stringify(data.test_portal, null, 2).substring(0, 2000));

console.log("\n=== psychTestSeriesData key content ===");
console.log(JSON.stringify(data.psychTestSeriesData, null, 2).substring(0, 2000));
