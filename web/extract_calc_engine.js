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
      timeout: 20000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    }).on('error', (err) => resolve({ error: err.message }));
  });
}

async function extractAndSaveJS(url, filename) {
  console.log(`\nFetching: ${url}`);
  const res = await fetchUrl(url);
  console.log(`Status: ${res.status}, Length: ${res.body?.length || 0}`);
  
  if (!res.body) return;
  
  // Save full page
  fs.writeFileSync(filename + '_full.html', res.body);
  
  // Extract all inline scripts
  const scripts = [];
  let pos = 0;
  while (true) {
    const start = res.body.indexOf('<script', pos);
    if (start === -1) break;
    const tagEnd = res.body.indexOf('>', start);
    if (tagEnd === -1) break;
    const src = res.body.slice(start, tagEnd).match(/src=["']([^"']+)["']/);
    if (!src) {
      const end = res.body.indexOf('</script>', tagEnd);
      if (end !== -1) {
        const content = res.body.slice(tagEnd + 1, end).trim();
        if (content.length > 50) scripts.push(content);
      }
      pos = tagEnd + 1;
    } else {
      scripts.push(`// EXTERNAL: ${src[1]}`);
      pos = tagEnd + 1;
    }
  }
  
  fs.writeFileSync(filename + '_scripts.js', scripts.join('\n\n// ===== NEXT SCRIPT =====\n\n'));
  console.log(`Saved ${scripts.length} script blocks to ${filename}_scripts.js`);
  
  // Look for key calculation-related patterns
  const patterns = [
    /wpm/gi, /gross/gi, /net_wpm/gi, /error/gi, /keystroke/gi, 
    /depression/gi, /backspace/gi, /qualify/gi, /pass/gi, /fail/gi,
    /formula/gi, /calculate/gi, /result/gi, /speed/gi
  ];
  
  const fullScript = scripts.join('\n');
  const found = new Set();
  for (const p of patterns) {
    const matches = fullScript.match(p);
    if (matches) found.add(`${p.source}: ${matches.length} occurrences`);
  }
  console.log('Key patterns found:', [...found].join(', '));
}

async function main() {
  // Fetch the result page directly (result3.php)
  await extractAndSaveJS('https://typingmitra.in/result3.php', 'result3');
  
  // Also fetch result for specific passage
  await extractAndSaveJS('https://typingmitra.in/result4.php', 'result4');
  
  // Fetch exam info pages to get rules
  const examRulesPages = [
    'https://typingmitra.in/exam/ssc-chsl-typing',
    'https://typingmitra.in/exam/ssc-cgl-typing',
    'https://typingmitra.in/exam/rrb-ntpc-typing',
    'https://typingmitra.in/exam/csir-exam-new-rules(formula)',
    'https://typingmitra.in/exam/mp-cpct-typing',
    'https://typingmitra.in/exam/upsssc-junior-assistant-typing',
  ];
  
  const examData = {};
  for (const url of examRulesPages) {
    const res = await fetchUrl(url);
    if (res.body) {
      // Extract rule text - look for table data with exam rules
      const slug = url.split('/').pop();
      
      // Find all text between table cells that mention WPM, error, keystrokes
      const ruleBlocks = [];
      
      // Extract paragraphs with rules
      const paras = [...res.body.matchAll(/<(?:p|td|li|h[1-6])[^>]*>([^<]{20,})<\/(?:p|td|li|h[1-6])>/gi)];
      for (const m of paras) {
        const text = m[1].replace(/&nbsp;/g, ' ').trim();
        if (/wpm|error|keystroke|depression|speed|qualifying|minute|backspace|formula/i.test(text)) {
          ruleBlocks.push(text);
        }
      }
      
      examData[slug] = ruleBlocks;
      console.log(`\n${slug}: ${ruleBlocks.length} rule blocks found`);
      for (const r of ruleBlocks.slice(0, 10)) console.log(`  → ${r}`);
    }
  }
  
  fs.writeFileSync('exam_rules_raw.json', JSON.stringify(examData, null, 2));
  console.log('\nSaved exam rules to exam_rules_raw.json');
}

main().catch(console.error);
