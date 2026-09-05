const https = require('https');

const COOKIE = 'PHPSESSID=uh2chjlk6rdd8ea0lm533gklii';

function fetchUrl(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': COOKIE,
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 15000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', (err) => resolve({ error: err.message }));
  });
}

function extractDiv(html, id) {
  const startTag = `id="${id}"`;
  const pos = html.indexOf(startTag);
  if (pos === -1) return null;
  const openEnd = html.indexOf('>', pos);
  if (openEnd === -1) return null;
  const textareaPos = html.indexOf('<textarea', openEnd);
  const closeDivPos = html.indexOf('</div>', openEnd);
  const endPos = (textareaPos !== -1 && textareaPos < closeDivPos) ? textareaPos : closeDivPos;
  if (endPos === -1) return null;
  const inner = html.slice(openEnd + 1, endPos);
  const text = inner
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 80 ? text : null;
}

async function main() {
  // Test the premium/failed passage IDs
  const tests = [
    { url: 'https://typingmitra.in/test4.php?passage_id=2482', name: '2482' },
    { url: 'https://typingmitra.in/test4.php?passage_id=2483', name: '2483' },
    { url: 'https://typingmitra.in/test4.php?passage_id=139',  name: '139 (CGL)' },
    { url: 'https://typingmitra.in/test4.php?passage_id=140',  name: '140 (CGL)' },
  ];
  
  for (const t of tests) {
    const res = await fetchUrl(t.url);
    const passage = res.body ? extractDiv(res.body, 'z6') : null;
    console.log(`\n${t.name} (${t.url})`);
    console.log(`  Status: ${res.status} | has z6: ${res.body?.includes('id="z6"')} | passage: ${passage ? 'YES ('+passage.length+' chars)' : 'NO'}`);
    if (passage) console.log(`  Preview: "${passage.slice(0, 120)}..."`);
    else if (res.body) {
      // What does z6 contain?
      const pos = res.body.indexOf('id="z6"');
      if (pos !== -1) {
        const openEnd = res.body.indexOf('>', pos);
        const snippet = res.body.slice(openEnd + 1, openEnd + 300);
        console.log(`  z6 inner: "${snippet.slice(0, 200)}"`);
      }
    }
  }
}
main().catch(console.error);
