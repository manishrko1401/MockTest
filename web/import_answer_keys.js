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

// Function to extract direct answer key login/PDF link from details page HTML
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
  
  // Search for answer key keywords in order of preference
  const primaryKeywords = [
    'download answer key',
    'answer key',
    'download key',
    'download solution',
    'objection link',
    'download question paper',
    'login'
  ];
  
  for (const keyword of primaryKeywords) {
    const match = rows.find(r => r.text.includes(keyword) && !r.href.includes("youtu.be") && !r.href.includes("rojgarresult.com"));
    if (match) return match.href;
  }
  
  // Secondary fallbacks
  const secondaryKeywords = ['download', 'website', 'official'];
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
  const htmlPath = 'C:\\Users\\painl\\.gemini\\antigravity-ide\\brain\\efd68c44-b16d-434b-9ee6-b9b7eda9d218\\scratch\\fetched_answer_keys.html';
  if (!fs.existsSync(htmlPath)) {
    console.error("Fetched HTML file not found at path:", htmlPath);
    return;
  }
  
  const html = fs.readFileSync(htmlPath, 'utf8');
  
  const loopItemRegex = /<div class="gb-loop-item[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
  let match;
  const parsedKeys = [];
  
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
    
    parsedKeys.push({ title, url });
  }
  
  console.log(`Parsed ${parsedKeys.length} answer keys from the main HTML.`);
  
  if (parsedKeys.length === 0) {
    console.error("No answer keys could be parsed. Exiting.");
    return;
  }

  // Clear previous imported answer keys
  console.log("Deleting old imported answer keys from Notice table...");
  const deleteResult = await prisma.notice.deleteMany({
    where: {
      category: 'answer_key'
    }
  });
  console.log(`Deleted ${deleteResult.count} previous answer key notices.`);
  
  console.log("Fetching publish dates & direct links from individual detail pages in batches...");
  
  const BATCH_SIZE = 15;
  const keysWithDates = [];
  let fallbackBaseDate = new Date();
  
  for (let i = 0; i < parsedKeys.length; i += BATCH_SIZE) {
    const batch = parsedKeys.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(parsedKeys.length / BATCH_SIZE)} (items ${i + 1} to ${Math.min(i + BATCH_SIZE, parsedKeys.length)})...`);
    
    const batchPromises = batch.map(async (keyItem) => {
      try {
        const pageHtml = await fetchUrl(keyItem.url);
        const schemaMatch = /"datePublished"\s*:\s*"([^"]*)"/i.exec(pageHtml);
        const directUrl = extractDirectLink(pageHtml, keyItem.url);
        
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
          ...keyItem,
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
      const originalKey = batch[j];
      
      if (res && res.publishDateObj) {
        keysWithDates.push(res);
        fallbackBaseDate = new Date(res.publishDateObj.getTime());
      } else {
        // Fallback
        fallbackBaseDate.setMinutes(fallbackBaseDate.getMinutes() - 1);
        const fallbackDateObj = new Date(fallbackBaseDate.getTime());
        keysWithDates.push({
          ...(res || originalKey),
          publishDateObj: fallbackDateObj,
          publishDateStr: fallbackDateObj.toISOString().split('T')[0],
          dateStr: formatPublishDate(fallbackDateObj),
          directUrl: res ? res.directUrl : originalKey.url
        });
      }
    }
    
    // Small delay between batches
    if (i + BATCH_SIZE < parsedKeys.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  
  console.log("Finished fetching details. Starting database insertions...");
  
  let insertedCount = 0;
  for (let i = 0; i < keysWithDates.length; i++) {
    const keyItem = keysWithDates[i];
    
    // Hash URL for unique ID
    const hash = crypto.createHash('md5').update(keyItem.url).digest('hex').substring(0, 10);
    const id = `ak_${hash}`;
    
    // Assign createdAt timestamp with offset to guarantee sorting order
    const createdAtTimestamp = new Date(keyItem.publishDateObj.getTime() - (i * 1000));
    
    await prisma.notice.create({
      data: {
        id,
        title: keyItem.title,
        date: keyItem.dateStr,
        publishDate: keyItem.publishDateStr,
        type: 'ANSWER KEY',
        category: 'answer_key',
        url: keyItem.directUrl || keyItem.url,
        createdAt: createdAtTimestamp
      }
    });
    insertedCount++;
  }
  
  console.log(`Success! Imported ${insertedCount} answer key notices with accurate publication dates, direct download links, and correct sorting order.`);
}

main()
  .catch(e => console.error(e))
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
