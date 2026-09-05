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

async function test() {
  // SSC CHSL first test: test4.php?passage_id=2454
  const url = 'https://typingmitra.in/test4.php?passage_id=2454';
  console.log(`Fetching: ${url}`);
  const res = await fetchUrl(url);
  console.log(`Status: ${res.status}`);
  
  if (res.body) {
    // Look for all div IDs in the page
    const ids = [...res.body.matchAll(/id=["']([^"']+)["']/gi)].map(m => m[1]);
    console.log('\nAll IDs on page:', [...new Set(ids)].slice(0, 40));
    
    // Look for paragraph-related content
    const divMatches = [...res.body.matchAll(/<div[^>]+id=["'](display-paragraph|z6|passage|para|text|original)[^"']*["'][^>]*>([\s\S]{0,500}?)<\/div>/gi)];
    console.log(`\nPassage div matches: ${divMatches.length}`);
    for (const m of divMatches) {
      const text = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
      console.log(`  ID: ${m[1]} -> "${text}"`);
    }
    
    // Save raw HTML for inspection
    require('fs').writeFileSync('test_page_sample.html', res.body);
    console.log('\nRaw HTML saved to test_page_sample.html');
  }
}

test().catch(console.error);
