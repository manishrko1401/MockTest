const fs = require('fs');
const html = fs.readFileSync('fail_page_500.html', 'utf8');

console.log(`Body length: ${html.length}`);
console.log(`Has id="z6": ${html.includes('id="z6"')}`);

// Try our extraction function
function extractDiv(html, id) {
  const startTag = `id="${id}"`;
  const pos = html.indexOf(startTag);
  if (pos === -1) { console.log(`  ${id}: not found`); return null; }
  const openEnd = html.indexOf('>', pos);
  if (openEnd === -1) { console.log(`  ${id}: no > found`); return null; }
  const textareaPos = html.indexOf('<textarea', openEnd);
  const closeDivPos = html.indexOf('</div>', openEnd);
  console.log(`  ${id}: openEnd=${openEnd}, textareaPos=${textareaPos}, closeDivPos=${closeDivPos}`);
  const endPos = (textareaPos !== -1 && textareaPos < closeDivPos) ? textareaPos : closeDivPos;
  if (endPos === -1) { console.log(`  ${id}: no end found`); return null; }
  const inner = html.slice(openEnd + 1, endPos);
  console.log(`  ${id}: inner length=${inner.length}`);
  const text = inner
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  console.log(`  ${id}: text="${text.slice(0, 200)}"`);
  return text.length > 80 ? text : null;
}

extractDiv(html, 'z6');
