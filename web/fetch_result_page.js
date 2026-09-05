const https = require('https');
const querystring = require('querystring');
const fs = require('fs');

const COOKIE = 'PHPSESSID=uh2chjlk6rdd8ea0lm533gklii';

function postUrl(url, data) {
  return new Promise((resolve) => {
    const body = querystring.stringify(data);
    const urlObj = new URL(url);
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'Cookie': COOKIE,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json, text/html',
        'Referer': 'https://typingmitra.in/test4.php?passage_id=2454',
      },
      timeout: 20000
    }, (res) => {
      let result = '';
      res.on('data', d => result += d);
      res.on('end', () => resolve({ status: res.statusCode, body: result, location: res.headers.location, headers: res.headers }));
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.write(body);
    req.end();
  });
}

function fetchUrl(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': COOKIE, 'Accept': 'text/html',
      },
      timeout: 20000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data, location: res.headers.location }));
    }).on('error', (err) => resolve({ error: err.message }));
  });
}

async function main() {
  // Submit a test with known data to result4.php
  const testData = {
    passage_id: '2454',
    duration: '600',
    is_custom: '0',
    backspace_disabled: '0',
    typed_text: 'In the year 2025, a very big and beautiful change has come to the public libraries across India. For a long time, many libraries were just old buildings with dusty books, but now they have been turned into modern Knowledge Centers for everyone.',
    time_taken: '120', // seconds elapsed 
    keystroke_count: '243',
    backspace_count: '5',
    mistakes_count: '3',
    ajax: '1'
  };

  console.log('=== POSTing to result4.php (ajax=1) ===');
  const res = await postUrl('https://typingmitra.in/result4.php', testData);
  console.log(`Status: ${res.status}`);
  console.log(`Location: ${res.location}`);
  console.log(`Body (first 2000 chars):\n${res.body?.slice(0, 2000)}`);
  
  if (res.body) {
    fs.writeFileSync('result4_response.html', res.body);
    
    // If it returned JSON with result_id, fetch that result page
    try {
      const json = JSON.parse(res.body.trim());
      console.log('\nJSON response:', JSON.stringify(json, null, 2));
      if (json.result_id) {
        console.log(`\n=== Fetching result page: result4.php?result_id=${json.result_id} ===`);
        const resultPage = await fetchUrl(`https://typingmitra.in/result4.php?result_id=${json.result_id}`);
        console.log(`Status: ${resultPage.status}`);
        fs.writeFileSync('result4_page.html', resultPage.body || '');
        console.log('Saved result page to result4_page.html');
        
        // Extract scripts from result page
        const scripts = [];
        let pos = 0;
        const html = resultPage.body || '';
        while (true) {
          const start = html.indexOf('<script', pos);
          if (start === -1) break;
          const tagEnd = html.indexOf('>', start);
          if (tagEnd === -1) break;
          const hasSrc = html.slice(start, tagEnd).includes('src=');
          if (!hasSrc) {
            const end = html.indexOf('</script>', tagEnd);
            if (end !== -1) {
              const c = html.slice(tagEnd + 1, end).trim();
              if (c.length > 50) scripts.push(c);
              pos = end + 9;
            } else pos = tagEnd + 1;
          } else pos = tagEnd + 1;
        }
        const largest = scripts.sort((a,b) => b.length - a.length)[0];
        fs.writeFileSync('result4_main_script.js', largest || '');
        console.log(`Extracted ${scripts.length} scripts from result page, largest: ${largest?.length} chars`);
        console.log('\nLargest result script (first 5000 chars):');
        console.log(largest?.slice(0, 5000));
      }
    } catch(e) {
      console.log('Not JSON, checking HTML body for result data...');
      // Try to find result data in HTML
      const resultMatch = res.body.match(/result[_-]?id['":\s=]+([a-z0-9]+)/i);
      if (resultMatch) {
        console.log('Found result_id:', resultMatch[1]);
      }
    }
  }
}

main().catch(console.error);
