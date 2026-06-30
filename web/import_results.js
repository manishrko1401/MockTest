const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlLine = envContent.split('\n').find(line => line.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine ? dbUrlLine.split('DATABASE_URL=')[1].replace(/"/g, '').trim() : null;

const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Fetch utility with User-Agent
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`Status ${res.statusCode} for ${url}`));
        }
      });
    }).on('error', err => reject(err));
  });
}

function formatPublishDate(date) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Function to extract direct result download/view link from details page HTML
function extractDirectLink(pageHtml, defaultUrl) {
  const idx = pageHtml.toLowerCase().indexOf("important links");
  if (idx === -1) return defaultUrl;
  
  // Get 6000 characters after the heading to capture the table content
  const tableArea = pageHtml.substring(idx, idx + 6000);
  
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  const rows = [];
  
  while ((trMatch = trRegex.exec(tableArea)) !== null) {
    const rowHtml = trMatch[1];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdMatch;
    const cells = [];
    while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
      cells.push(tdMatch[1]);
    }
    
    if (cells.length >= 2) {
      const colText = cells[0].replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().toLowerCase();
      const hrefMatch = /href=["']([^"']*)["']/i.exec(cells[1]);
      if (hrefMatch) {
        const href = hrefMatch[1].trim();
        rows.push({ text: colText, href });
      }
    }
  }
  
  // Search for result keywords in order of preference
  const primaryKeywords = [
    'download result',
    'check result',
    'allotment result',
    'download scorecard',
    'merit list',
    'final result',
    'download list',
    'result'
  ];
  
  for (const keyword of primaryKeywords) {
    const match = rows.find(r => r.text.includes(keyword) && !r.href.includes("youtu.be") && !r.href.includes("rojgarresult.com"));
    if (match) return match.href;
  }
  
  // Secondary fallbacks
  const secondaryKeywords = ['download', 'login', 'website', 'official'];
  for (const keyword of secondaryKeywords) {
    const match = rows.find(r => r.text.includes(keyword) && !r.href.includes("youtu.be") && !r.href.includes("rojgarresult.com"));
    if (match) return match.href;
  }
  
  // First row link that isn't youtube or self-referential
  const firstValid = rows.find(r => !r.href.includes("youtu.be") && !r.href.includes("rojgarresult.com"));
  if (firstValid) return firstValid.href;
  
  return defaultUrl;
}

async function main() {
  const htmlPath = 'C:\\Users\\painl\\.gemini\\antigravity-ide\\brain\\efd68c44-b16d-434b-9ee6-b9b7eda9d218\\scratch\\fetched_results.html';
  if (!fs.existsSync(htmlPath)) {
    console.error("Fetched HTML file not found at path:", htmlPath);
    return;
  }
  
  const html = fs.readFileSync(htmlPath, 'utf8');
  
  const loopItemRegex = /<div class="gb-loop-item[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
  let match;
  const parsedResults = [];
  
  while ((match = loopItemRegex.exec(html)) !== null) {
    const itemHtml = match[1];
    
    // Extract Title
    const titleMatch = /<h2 class="gb-text[^"]*"[^>]*>([\s\S]*?)<\/h2>/i.exec(itemHtml);
    if (!titleMatch) continue;
    const title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
    
    // Extract URL
    const urlMatch = /<a class="gb-text[^"]*" href="([^"]*)"/i.exec(itemHtml);
    if (!urlMatch) continue;
    const url = urlMatch[1].trim();
    
    parsedResults.push({ title, url });
  }
  
  console.log(`Parsed ${parsedResults.length} results from the main HTML.`);
  
  if (parsedResults.length === 0) {
    console.error("No results could be parsed. Exiting.");
    return;
  }

  // Clear previous imported results to ensure correct chronological sorting order
  console.log("Deleting old imported results from Notice table...");
  const deleteResult = await prisma.notice.deleteMany({
    where: {
      category: 'result',
      type: 'RESULT'
    }
  });
  console.log(`Deleted ${deleteResult.count} previous result notices.`);
  
  console.log("Fetching publish dates & direct links from individual result detail pages in batches...");
  
  const BATCH_SIZE = 15;
  const resultsWithDates = [];
  let fallbackBaseDate = new Date(); // Start from current time
  
  for (let i = 0; i < parsedResults.length; i += BATCH_SIZE) {
    const batch = parsedResults.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(parsedResults.length / BATCH_SIZE)} (items ${i + 1} to ${Math.min(i + BATCH_SIZE, parsedResults.length)})...`);
    
    const batchPromises = batch.map(async (result) => {
      try {
        const pageHtml = await fetchUrl(result.url);
        const schemaMatch = /"datePublished"\s*:\s*"([^"]*)"/i.exec(pageHtml);
        const directUrl = extractDirectLink(pageHtml, result.url);
        
        let dateObj = null;
        let publishDateStr = null;
        let dateStr = null;
        
        if (schemaMatch) {
          const datePublished = schemaMatch[1];
          dateObj = new Date(datePublished);
          publishDateStr = datePublished.split('T')[0];
          dateStr = formatPublishDate(dateObj);
        }
        
        return {
          ...result,
          publishDateObj: dateObj,
          publishDateStr: publishDateStr,
          dateStr: dateStr,
          directUrl: directUrl
        };
      } catch (err) {
        // Failed to fetch details
      }
      return null;
    });
    
    const fetchResults = await Promise.all(batchPromises);
    
    // Process batch results
    for (let j = 0; j < batch.length; j++) {
      const res = fetchResults[j];
      const originalResult = batch[j];
      
      if (res && res.publishDateObj) {
        resultsWithDates.push(res);
        fallbackBaseDate = new Date(res.publishDateObj.getTime());
      } else {
        // Fallback: decrement fallback date by 1 minute to preserve order
        fallbackBaseDate.setMinutes(fallbackBaseDate.getMinutes() - 1);
        const fallbackDateObj = new Date(fallbackBaseDate.getTime());
        resultsWithDates.push({
          ...(res || originalResult),
          publishDateObj: fallbackDateObj,
          publishDateStr: fallbackDateObj.toISOString().split('T')[0],
          dateStr: formatPublishDate(fallbackDateObj),
          directUrl: res ? res.directUrl : originalResult.url
        });
      }
    }
    
    // Small delay between batches to avoid hammering the server
    if (i + BATCH_SIZE < parsedResults.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  
  console.log("Finished fetching details. Starting database insertions...");
  
  let insertedCount = 0;
  for (let i = 0; i < resultsWithDates.length; i++) {
    const res = resultsWithDates[i];
    
    // Hash URL for unique ID
    const hash = crypto.createHash('md5').update(res.url).digest('hex').substring(0, 10);
    const id = `res_${hash}`;
    
    // Assign createdAt timestamp with offset to guarantee sorting order
    const createdAtTimestamp = new Date(res.publishDateObj.getTime() - (i * 1000));
    
    await prisma.notice.create({
      data: {
        id,
        title: res.title,
        date: res.dateStr,
        publishDate: res.publishDateStr,
        type: 'RESULT',
        category: 'result',
        url: res.directUrl || res.url, // Save the direct link!
        createdAt: createdAtTimestamp
      }
    });
    insertedCount++;
  }
  
  console.log(`Success! Imported ${insertedCount} result notices with accurate publication dates, direct download links, and correct sorting order.`);
}

main()
  .catch(e => console.error(e))
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
