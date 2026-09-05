const fs = require('fs');
const https = require('https');

const COOKIE = 'PHPSESSID=uh2chjlk6rdd8ea0lm533gklii';

function fetchUrl(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': COOKIE, 'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 20000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data, location: res.headers.location }));
    }).on('error', (err) => resolve({ error: err.message }));
  });
}

function extractScripts(html) {
  const scripts = [];
  let pos = 0;
  while (true) {
    const start = html.indexOf('<script', pos);
    if (start === -1) break;
    const tagEnd = html.indexOf('>', start);
    if (tagEnd === -1) break;
    const hasSrc = html.slice(start, tagEnd).includes('src=');
    if (!hasSrc) {
      const end = html.indexOf('</script>', tagEnd);
      if (end !== -1) {
        const content = html.slice(tagEnd + 1, end).trim();
        if (content.length > 50) scripts.push(content);
        pos = end + 9;
      } else pos = tagEnd + 1;
    } else pos = tagEnd + 1;
  }
  return scripts;
}

async function main() {
  // We need an actual result page - let's simulate test submission via POST
  // First, let's get the test page scripts
  console.log('=== Fetching test4.php scripts ===');
  const testPage = await fetchUrl('https://typingmitra.in/test4.php?passage_id=2454');
  const testScripts = extractScripts(testPage.body || '');
  
  // Find the main calculation/submission script
  let calcScript = '';
  for (const s of testScripts) {
    if (s.includes('backspace') || s.includes('wpm') || s.includes('keystroke') || 
        s.includes('error') || s.includes('result') || s.includes('submit') ||
        s.includes('G_') || s.length > 500) {
      calcScript += '\n\n// ======= SCRIPT BLOCK =======\n' + s;
    }
  }
  fs.writeFileSync('test4_calc_scripts.js', calcScript);
  console.log(`Saved ${testScripts.length} total scripts, ${calcScript.length} chars of calc-related code`);
  
  // Print the full large script (usually the main one)
  const largestScript = testScripts.sort((a,b) => b.length - a.length)[0];
  console.log(`\nLargest script: ${largestScript?.length} chars`);
  console.log('First 5000 chars:');
  console.log(largestScript?.slice(0, 5000));
  
  fs.writeFileSync('test4_main_script.js', largestScript || '');
}

main().catch(console.error);
