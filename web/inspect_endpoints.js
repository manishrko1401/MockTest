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
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    }).on('error', (err) => resolve({ error: err.message }));
  });
}

async function inspectEndpoints() {
  const endpoints = [
    'test1.php?passage_id=1916',
    'test2.php?passage_id=142',
    'test3.php?passage_id=4522',
    'test4.php?passage_id=2454',
    'test5.php?passage_id=809',
    'test7.php?passage_id=107',
    'test8.php?passage_id=2244',
    'test10.php?passage_id=3500',
    'test11.php?passage_id=2709',
    'test12.php?passage_id=101',
    'test13.php?passage_id=4769',
    'test14.php?passage_id=6093',
    'test15.php?passage_id=6017',
    'test16.php?passage_id=5189',
    'test25.php?passage_id=6789',
  ];

  const summary = {};

  for (const ep of endpoints) {
    const epName = ep.split('?')[0];
    const res = await fetchUrl('https://typingmitra.in/' + ep);
    if (!res.body) {
      console.log(`Failed to fetch ${ep}`);
      continue;
    }

    // Find form action
    const formActionMatch = res.body.match(/<form[^>]+action=["']([^"']+)["']/i);
    const formAction = formActionMatch ? formActionMatch[1] : 'unknown';

    // Find exam title in header
    const titleMatch = res.body.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Find input fields
    const inputs = [...res.body.matchAll(/<input[^>]+name=["']([^"']+)["']/gi)].map(m => m[1]);

    summary[epName] = {
      title,
      formAction,
      inputs: Array.from(new Set(inputs)),
      bodyLength: res.body.length
    };
    console.log(`[${epName}] -> Action: ${formAction} | Title: ${title}`);
  }

  fs.writeFileSync('test_endpoints_summary.json', JSON.stringify(summary, null, 2));
}

inspectEndpoints().catch(console.error);
