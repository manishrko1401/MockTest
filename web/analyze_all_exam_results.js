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

async function analyzeAllExams() {
  const manifest = JSON.parse(fs.readFileSync(
    'C:/Users/painl/.gemini/antigravity-ide/brain/7e4e1b45-7d2e-446a-b79f-90c2da33d904/scratch/typingmitra_all_exam_manifest.json',
    'utf8'
  ));

  const results = {};
  const testPhpEndpoints = new Set();

  for (const [catSlug, tests] of Object.entries(manifest)) {
    if (!tests || tests.length === 0) continue;
    const sampleTest = tests[0];
    const testUrl = sampleTest.testUrl || '';
    const endpoint = testUrl.split('?')[0];
    testPhpEndpoints.add(endpoint);

    results[catSlug] = {
      testCount: tests.length,
      sampleTestUrl: testUrl,
      testEndpoint: endpoint,
    };
  }

  console.log('Unique test player endpoints found across categories:', Array.from(testPhpEndpoints));
  console.log('Category mapping sample:');
  console.log(JSON.stringify(results, null, 2));

  fs.writeFileSync('exam_category_endpoints.json', JSON.stringify({
    uniqueEndpoints: Array.from(testPhpEndpoints),
    categoryMap: results
  }, null, 2));
}

analyzeAllExams().catch(console.error);
