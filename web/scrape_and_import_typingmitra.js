const https = require('https');
const fs = require('fs');
const path = require('path');

// Usage: node scrape_and_import_typingmitra.js [--cookie "PHPSESSID=..."]

const args = process.argv.slice(2);
let cookie = '';
const cookieIdx = args.indexOf('--cookie');
if (cookieIdx !== -1 && args[cookieIdx + 1]) {
  cookie = args[cookieIdx + 1];
}

console.log("==========================================================");
console.log("  TYPINGMITRA.IN BATCH PASSAGE SCRAPER & IMPORTER");
console.log("==========================================================");
if (cookie) {
  console.log(`Using Session Cookie: ${cookie.slice(0, 15)}...`);
} else {
  console.log("No cookie provided. Scraping public/sample passages.");
  console.log("Tip: Provide your login session cookie with --cookie 'PHPSESSID=your_session_id' to scrape all premium passages!");
}

function fetchPage(url, userCookie = '') {
  return new Promise((resolve) => {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };
    if (userCookie) {
      headers['Cookie'] = userCookie.startsWith('PHPSESSID=') ? userCookie : `PHPSESSID=${userCookie}`;
    }

    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    }).on('error', (err) => {
      resolve({ error: err.message });
    });
  });
}

function extractPassageFromHtml(html) {
  if (!html) return null;

  let text = '';

  const boxMatches = [
    /<div[^>]+id=["'](?:passage|test_passage|passage_text|paragraph|typing_text)["'][^>]*>([\s\S]*?)<\/div>/i,
    /<textarea[^>]+id=["'](?:passage|source_text|original_text)["'][^>]*>([\s\S]*?)<\/textarea>/i,
    /<div[^>]+class=["'][^"']*(?:passage-box|text-to-type|highlight-passage)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
  ];

  for (const regex of boxMatches) {
    const match = html.match(regex);
    if (match && match[1]) {
      text = match[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length > 50) break;
    }
  }

  if (!text || text.length < 50) {
    const jsVarMatches = [
      /(?:var|let|const)\s+(?:passage|passage_text|originalText|targetText|sourceText|text)\s*=\s*["'`]([\s\S]*?)["'`];/i,
      /"passageText"\s*:\s*"([^"]+)"/i
    ];
    for (const regex of jsVarMatches) {
      const match = html.match(regex);
      if (match && match[1]) {
        text = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\s+/g, ' ').trim();
        if (text.length > 50) break;
      }
    }
  }

  let title = '';
  const titleMatch = html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
  if (titleMatch) {
    title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
  }

  let durationMinutes = 10;
  const durMatch = html.match(/(\d+)\s*(?:min|minute|Minutes)/i);
  if (durMatch) {
    durationMinutes = parseInt(durMatch[1], 10);
  }

  if (text && text.length > 30) {
    return {
      title: title || 'Typing Practice Passage',
      text,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      charCount: text.length,
      durationMinutes
    };
  }

  return null;
}

async function run() {
  const manifestPath = 'C:/Users/painl/.gemini/antigravity-ide/brain/7e4e1b45-7d2e-446a-b79f-90c2da33d904/scratch/typingmitra_passages_manifest.json';
  let manifest = {};
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  }

  const scrapedPassages = [];
  const outputDir = path.join(__dirname, 'scraped_passages');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  for (const [slug, exData] of Object.entries(manifest)) {
    console.log(`\nProcessing Category: ${exData.name} (${exData.passages.length} passages)...`);

    for (const p of exData.passages) {
      console.log(`  Fetching ${p.fullUrl}...`);
      const res = await fetchPage(p.fullUrl, cookie);

      if (res.status === 302) {
        console.log(`  ⚠️ Requires login (Redirect 302 to login.php). Provide --cookie "PHPSESSID=..." to unlock.`);
        continue;
      }

      const extracted = extractPassageFromHtml(res.body);
      if (extracted) {
        console.log(`  ✅ Extracted: "${extracted.title}" (${extracted.wordCount} words, ${extracted.charCount} chars)`);
        scrapedPassages.push({
          categorySlug: slug,
          categoryName: exData.name,
          passageId: p.passageId,
          ...extracted
        });
      } else {
        console.log(`  ℹ️ No text found or page requires authentication.`);
      }
    }
  }

  console.log(`\n==========================================================`);
  console.log(`SCRAPING COMPLETE: Extracted ${scrapedPassages.length} passages.`);
  fs.writeFileSync(path.join(outputDir, 'typingmitra_scraped_passages.json'), JSON.stringify(scrapedPassages, null, 2));
  console.log(`Saved output to ${path.join(outputDir, 'typingmitra_scraped_passages.json')}`);
}

run();
