const fs = require('fs');

const html = fs.readFileSync('scratch/adda247_html_sample.html', 'utf-8');

console.log("HTML File Size:", html.length, "bytes");

// Search for INITIAL_STATE, script tags, __NEXT_DATA__, window.testData, etc.
const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let scriptIndex = 0;

while ((match = scriptRegex.exec(html)) !== null) {
  const scriptContent = match[1];
  if (
    scriptContent.includes('INITIAL_STATE') ||
    scriptContent.includes('questions') ||
    scriptContent.includes('testData') ||
    scriptContent.includes('sections') ||
    scriptContent.includes('mockTest') ||
    scriptContent.includes('solution')
  ) {
    console.log(`\n================ Script ${scriptIndex} matches key terms ================`);
    console.log("Length:", scriptContent.length);
    console.log("Snippet:", scriptContent.substring(0, 500));
    fs.writeFileSync(`scratch/script_${scriptIndex}.js`, scriptContent);
  }
  scriptIndex++;
}
