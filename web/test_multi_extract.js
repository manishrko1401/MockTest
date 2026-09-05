const https = require('https');
const fs = require('fs');

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

function extractPassage(html) {
  if (!html) return null;
  function extractDiv(id) {
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
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > 80 ? text : null;
  }
  for (const id of ['z6', 'display-paragraph', 'passage', 'original-text', 'para']) {
    const r = extractDiv(id);
    if (r) return r;
  }
  return null;
}

async function testMultiple() {
  // Test 5 different categories
  const tests = [
    { url: 'https://typingmitra.in/test4.php?passage_id=2454', name: 'SSC CHSL test4' },
    { url: 'https://typingmitra.in/test1.php?passage_id=101',  name: 'SSC CGL test1' },
    { url: 'https://typingmitra.in/test14.php?passage_id=1001', name: 'Delhi Police test14' },
    { url: 'https://typingmitra.in/test15.php?passage_id=2001', name: 'RRB NTPC test15' },
    { url: 'https://typingmitra.in/test25.php?passage_id=3001', name: 'DSSSB test25' },
  ];

  for (const t of tests) {
    const res = await fetchUrl(t.url);
    const passage = res.body ? extractPassage(res.body) : null;
    if (passage) {
      console.log(`\n✅ ${t.name} [${passage.length} chars]`);
      console.log(`   "${passage.slice(0, 150)}..."`);
    } else {
      console.log(`\n❌ ${t.name} - No passage found (status: ${res.status})`);
      if (res.body) {
        const ids = [...res.body.matchAll(/id=["']([^"']{1,20})["']/gi)].map(m => m[1]).slice(0,15);
        console.log(`   Page IDs: ${ids.join(', ')}`);
      }
    }
  }
}

testMultiple().catch(console.error);
