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
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    }).on('error', (err) => resolve({ error: err.message }));
  });
}

async function main() {
  // Test a passage that probably fails - try a higher numbered one
  const urls = [
    'https://typingmitra.in/test4.php?passage_id=500',
    'https://typingmitra.in/test4.php?passage_id=900',
    'https://typingmitra.in/test4.php?passage_id=1200',
    'https://typingmitra.in/test4.php?passage_id=3000',
  ];
  
  for (const url of urls) {
    const res = await fetchUrl(url);
    console.log(`\n${url}`);
    console.log(`Status: ${res.status}`);
    if (res.body) {
      // Check if z6 exists
      const hasZ6 = res.body.includes('id="z6"');
      const hasPremium = res.body.toLowerCase().includes('premium') || res.body.toLowerCase().includes('locked');
      const hasLogin = res.body.toLowerCase().includes('login') || res.body.toLowerCase().includes('signin');
      
      const z6Start = res.body.indexOf('id="z6"');
      let snippet = '';
      if (z6Start !== -1) {
        const openEnd = res.body.indexOf('>', z6Start);
        const textareaPos = res.body.indexOf('<textarea', openEnd);
        const closeDivPos = res.body.indexOf('</div>', openEnd);
        const endPos = (textareaPos !== -1 && textareaPos < closeDivPos) ? textareaPos : closeDivPos;
        snippet = res.body.slice(openEnd + 1, Math.min(openEnd + 200, endPos)).replace(/\s+/g, ' ').trim();
      }
      
      console.log(`  hasZ6: ${hasZ6} | hasPremium: ${hasPremium} | hasLogin: ${hasLogin}`);
      if (snippet) console.log(`  z6 content: "${snippet}"`);
    }
  }
}
main().catch(console.error);
