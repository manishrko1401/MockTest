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

async function main() {
  // passage_id=500 returned 200 but no z6
  const res = await fetchUrl('https://typingmitra.in/test4.php?passage_id=500');
  console.log(`Status: ${res.status}, Body length: ${res.body.length}`);
  
  // Save for inspection
  fs.writeFileSync('fail_page_500.html', res.body);
  
  // What IDs are on this page?
  const ids = [...res.body.matchAll(/id=["']([^"']+)["']/gi)].map(m => m[1]);
  console.log('IDs:', [...new Set(ids)].slice(0, 30));
  
  // Is there a redirect or error message?
  const keywords = ['error', 'invalid', 'not found', 'expired', 'login', 'premium', 'upgrade', 'subscribe'];
  for (const kw of keywords) {
    if (res.body.toLowerCase().includes(kw)) {
      const idx = res.body.toLowerCase().indexOf(kw);
      console.log(`Found "${kw}" at pos ${idx}: ...${res.body.slice(Math.max(0,idx-30), idx+100)}...`);
    }
  }
  
  // Print first 2000 chars
  console.log('\nFirst 2000 chars:');
  console.log(res.body.slice(0, 2000));
}
main().catch(console.error);
