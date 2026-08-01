const fs = require('fs');

const script2 = fs.readFileSync('scratch/script_2.js', 'utf-8');

// Strip "window.INITIAL_STATE = " and trailing semicolon
let jsonStr = script2.trim();
if (jsonStr.startsWith('window.INITIAL_STATE =')) {
  jsonStr = jsonStr.replace(/^window\.INITIAL_STATE\s*=\s*/, '');
}
if (jsonStr.endsWith(';')) {
  jsonStr = jsonStr.slice(0, -1);
}

try {
  const data = JSON.parse(jsonStr);
  console.log("Top-level keys in INITIAL_STATE:", Object.keys(data));
  
  for (const key of Object.keys(data)) {
    console.log(`\nKey: [${key}]`);
    if (typeof data[key] === 'object' && data[key] !== null) {
      console.log(`Sub-keys of [${key}]:`, Object.keys(data[key]));
    }
  }

  // Search recursively for questions or sections or mock test data
  function searchKey(obj, path = "") {
    if (!obj || typeof obj !== 'object') return;
    for (const k in obj) {
      const newPath = path ? `${path}.${k}` : k;
      if (k.toLowerCase().includes('question') || k.toLowerCase().includes('section') || k.toLowerCase().includes('solution') || k.toLowerCase().includes('testdata') || k.toLowerCase().includes('mock')) {
        console.log(`Found candidate path: ${newPath} -> type: ${Array.isArray(obj[k]) ? 'Array[' + obj[k].length + ']' : typeof obj[k]}`);
      }
      if (typeof obj[k] === 'object' && newPath.split('.').length < 6) {
        searchKey(obj[k], newPath);
      }
    }
  }

  console.log("\n--- Searching for Question/Section/Mock candidate paths ---");
  searchKey(data);

} catch (err) {
  console.error("JSON parse error:", err.message);
}
