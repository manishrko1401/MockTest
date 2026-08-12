const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Connection': 'keep-alive'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, data });
      });
    }).on('error', err => reject(err));
  });
}

async function testListingUrls() {
  const categories = [
    { name: 'Latest Jobs', url: 'https://rojgarresult.com/recruitments/' },
    { name: 'Results', url: 'https://rojgarresult.com/result/' },
    { name: 'Admit Card', url: 'https://rojgarresult.com/admit-card/' },
    { name: 'Answer Key', url: 'https://rojgarresult.com/answer-key/' }
  ];

  for (const cat of categories) {
    console.log(`\n=== Testing ${cat.name} (${cat.url}) ===`);
    const res = await fetchUrl(cat.url);
    const html = res.data;
    const parts = html.split('class="gb-loop-item');
    console.log(`Found ${parts.length - 1} loop items.`);

    let validCount = 0;
    let redirectCount = 0;

    for (let i = 1; i <= Math.min(10, parts.length - 1); i++) {
      const part = parts[i];
      const h2Match = /<h2[^>]*>([\s\S]+?)<\/h2>/i.exec(part);
      const hrefMatch = /href="([^"]+)"/i.exec(part);

      if (h2Match && hrefMatch) {
        const title = h2Match[1].replace(/<[^>]*>/g, '').trim();
        const postUrl = hrefMatch[1].trim();

        // Check individual page
        const postRes = await fetchUrl(postUrl);
        const postHtml = postRes.data;
        const isHomePage = postHtml.includes('gb-element-64f84b33 pulse-box') || (postHtml.match(/gb-loop-item/g) || []).length > 5;
        const hasTable = postHtml.includes('<table');

        console.log(`[${i}] "${title.substring(0, 40)}..."`);
        console.log(`    URL: ${postUrl}`);
        console.log(`    Is Redirect/Home: ${isHomePage} | Has Table: ${hasTable} | Size: ${postHtml.length}`);

        if (isHomePage) redirectCount++;
        else validCount++;
      }
    }
    console.log(`Result for ${cat.name}: ${validCount} valid post pages, ${redirectCount} home redirects.`);
  }
}

testListingUrls().catch(console.error);
