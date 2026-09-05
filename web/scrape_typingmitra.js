const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          const u = new URL(url);
          redirectUrl = `${u.origin}${redirectUrl.startsWith('/') ? '' : '/'}${redirectUrl}`;
        }
        return fetchUrl(redirectUrl).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

async function scrapeAll() {
  console.log('Fetching exams.php...');
  const examsHtml = await fetchUrl('https://typingmitra.in/exams.php');
  
  // Save exams html for reference
  fs.writeFileSync(path.join(__dirname, 'typingmitra_exams.html'), examsHtml);

  // Extract all cards
  // <div class="col-lg-3 col-md-4 col-sm-6 exam-card" data-name="..."> ... </div>
  const cardRegex = /<div class="col-lg-3 col-md-4 col-sm-6 exam-card"[\s\S]*?data-name="([^"]+)"[\s\S]*?<img src="([^"]+)"[^>]*alt="([^"]*)"[\s\S]*?<h4 class="card-title mb-3">([\s\S]*?)<\/h4>[\s\S]*?<a href="([^"]+)"/g;

  let match;
  const categories = [];
  while ((match = cardRegex.exec(examsHtml)) !== null) {
    let imgUrl = match[2].trim();
    if (imgUrl.startsWith('/')) {
      imgUrl = 'https://typingmitra.in' + imgUrl;
    }
    let link = match[5].trim();
    if (link.startsWith('/')) {
      link = 'https://typingmitra.in' + link;
    }
    
    categories.push({
      dataName: match[1].trim(),
      logoUrl: imgUrl,
      alt: match[3].trim(),
      name: match[4].trim(),
      examUrl: link,
      slug: match[5].replace('/exam/', '').replace('/', '').trim()
    });
  }

  console.log(`Found ${categories.length} exam categories!`);
  
  // Now fetch inner details for every category
  const detailedCategories = [];
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    console.log(`[${i+1}/${categories.length}] Scraping inner details for: ${cat.name} (${cat.slug})...`);
    try {
      const pageHtml = await fetchUrl(cat.examUrl);
      
      // Extract title in inner page
      const titleMatch = pageHtml.match(/<h1 class="display-5 fw-bold text-gradient-primary mb-3">([\s\S]*?)<\/h1>/);
      const innerTitle = titleMatch ? titleMatch[1].trim() : cat.name;

      // Extract description
      const descMatch = pageHtml.match(/<p class="lead mb-4">([\s\S]*?)<\/p>/);
      const description = descMatch ? descMatch[1].trim() : '';

      // Extract rules
      const rulesMatch = pageHtml.match(/<p class="mb-0 text-center text-md-start">([\s\S]*?)<\/p>/);
      const rules = rulesMatch ? rulesMatch[1].trim() : '';

      // Extract official PDF link
      const pdfMatch = pageHtml.match(/<a href="([^"]+)"[^>]*title="View official rules PDF"/);
      let pdfUrl = pdfMatch ? pdfMatch[1].trim() : '';
      if (pdfUrl && pdfUrl.startsWith('/')) {
        pdfUrl = 'https://typingmitra.in' + pdfUrl;
      }

      // Extract Available Languages and Passages
      const hasEnglish = pageHtml.includes('btn-english');
      const hasHindi = pageHtml.includes('btn-hindi');
      
      const countMatch = pageHtml.match(/Showing <strong>English<\/strong> passages \((\d+) available\)/i);
      const englishPassageCount = countMatch ? parseInt(countMatch[1]) : 0;

      // Extract levels present in English (Easy Level, Medium Level, Hard Level)
      const hasEasy = pageHtml.includes('Easy Level');
      const hasMedium = pageHtml.includes('Medium Level');
      const hasHard = pageHtml.includes('Hard Level');

      // Check Hindi passages if available
      let hindiPassageCount = 0;
      if (hasHindi) {
        try {
          const hindiHtml = await fetchUrl(`${cat.examUrl}?ajax=1&lang=hindi`);
          const rowMatches = hindiHtml.match(/<tr>/g);
          hindiPassageCount = rowMatches ? rowMatches.length - 1 : 0; // subtract header if any or count rows
          if (hindiPassageCount < 0) hindiPassageCount = 0;
        } catch (e) {
          console.log(`   Could not fetch Hindi count for ${cat.name}`);
        }
      }

      detailedCategories.push({
        ...cat,
        innerTitle,
        description,
        rules,
        pdfUrl,
        hasEnglish,
        hasHindi,
        englishPassageCount,
        hindiPassageCount,
        hasEasy,
        hasMedium,
        hasHard
      });

    } catch (e) {
      console.error(`Error fetching inner details for ${cat.name}:`, e.message);
      detailedCategories.push(cat);
    }
  }

  fs.writeFileSync(path.join(__dirname, 'all_typing_categories_scraped.json'), JSON.stringify(detailedCategories, null, 2));
  console.log('\nSUCCESS! Scraped all categories and saved to all_typing_categories_scraped.json');
}

scrapeAll().catch(console.error);
