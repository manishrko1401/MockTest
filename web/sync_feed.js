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

// Function to extract direct link from details page HTML
function extractDirectLink(pageHtml, defaultUrl, category) {
  const idx = pageHtml.toLowerCase().indexOf("important links");
  if (idx === -1) return defaultUrl;
  
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
  
  let primaryKeywords = [];
  let secondaryKeywords = [];
  
  if (category === 'result') {
    primaryKeywords = ['download result', 'check result', 'allotment result', 'download scorecard', 'merit list', 'final result', 'download list', 'result'];
    secondaryKeywords = ['download', 'login', 'website', 'official'];
  } else if (category === 'admit_card') {
    primaryKeywords = ['download admit card', 'admit card', 'download call letter', 'call letter', 'download exam city', 'city details', 'city intimation', 'login'];
    secondaryKeywords = ['download', 'website', 'official'];
  } else {
    // Jobs/notices
    primaryKeywords = ['apply online', 'online apply', 'online application', 'apply', 'registration', 'login'];
    secondaryKeywords = ['download notification', 'notification', 'website', 'official'];
  }
  
  for (const keyword of primaryKeywords) {
    const match = rows.find(r => r.text.includes(keyword) && !r.href.includes("youtu.be") && !r.href.includes("rojgarresult.com"));
    if (match) return match.href;
  }
  
  for (const keyword of secondaryKeywords) {
    const match = rows.find(r => r.text.includes(keyword) && !r.href.includes("youtu.be") && !r.href.includes("rojgarresult.com"));
    if (match) return match.href;
  }
  
  const firstValid = rows.find(r => !r.href.includes("youtu.be") && !r.href.includes("rojgarresult.com"));
  if (firstValid) return firstValid.href;
  
  return defaultUrl;
}

// Map RSS feed categories/tags to database notice category and type
function mapCategoryAndType(xmlCategoriesStr, url, title) {
  const categories = xmlCategoriesStr.toLowerCase();
  const path = url.toLowerCase();
  const text = title.toLowerCase();
  
  if (categories.includes('result') || path.includes('/result/') || text.includes('result') || text.includes('allotment')) {
    return { category: 'result', type: 'RESULT', prefix: 'res_' };
  } else if (categories.includes('admit card') || categories.includes('admit-card') || path.includes('/admit-card/') || text.includes('admit card') || text.includes('call letter') || text.includes('city info')) {
    return { category: 'admit_card', type: 'ADMIT CARD', prefix: 'ac_' };
  } else if (categories.includes('answer key') || categories.includes('answer-key') || path.includes('/answer-key/') || text.includes('answer key') || text.includes('answerkey') || text.includes('key')) {
    return { category: 'answer_key', type: 'ANSWER KEY', prefix: 'ak_' };
  } else {
    return { category: 'notice', type: 'JOB', prefix: 'job_' };
  }
}

async function syncFeed() {
  console.log("Checking RSS feed for updates...");
  let feedXml = '';
  try {
    feedXml = await fetchUrl('https://rojgarresult.com/feed/');
  } catch (err) {
    console.error("Failed to fetch RSS feed:", err.message);
    return;
  }
  
  // Extract all <item> tags
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  const feedItems = [];
  
  while ((match = itemRegex.exec(feedXml)) !== null) {
    const itemXml = match[1];
    
    const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(itemXml);
    const linkMatch = /<link>([\s\S]*?)<\/link>/.exec(itemXml);
    const dateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(itemXml);
    
    // Extract categories
    const catRegex = /<category>[\s\S]*?<!\[CDATA\[([\s\S]*?)\]\]>[\s\S]*?<\/category>/gi;
    let catMatch;
    const itemCats = [];
    while ((catMatch = catRegex.exec(itemXml)) !== null) {
      itemCats.push(catMatch[1]);
    }
    
    if (linkMatch) {
      const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim() : '';
      const link = linkMatch[1].replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim();
      const pubDate = dateMatch ? dateMatch[1].replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim() : '';
      feedItems.push({ title, link, pubDate, categories: itemCats.join(', ') });
    }
  }
  
  console.log(`Parsed ${feedItems.length} items from RSS feed.`);
  
  let newNoticesCount = 0;
  
  for (let i = feedItems.length - 1; i >= 0; i--) {
    const item = feedItems[i];
    
    // Map categories & type
    const { category, type, prefix } = mapCategoryAndType(item.categories, item.link, item.title);
    
    // Generate clean ID from link hash
    const hash = crypto.createHash('md5').update(item.link).digest('hex').substring(0, 10);
    const id = `${prefix}${hash}`;
    
    // Check if notice already exists in database
    const existing = await prisma.notice.findUnique({
      where: { id }
    });
    
    if (existing) {
      // Notice already imported, skip
      continue;
    }
    
    console.log(`Found NEW notice: "${item.title}"`);
    console.log(`  Link: ${item.link}`);
    console.log(`  Mapped Category: ${category}, Type: ${type}`);
    
    // Fetch detail page HTML to extract direct link & publish date
    let dateObj = item.pubDate ? new Date(item.pubDate) : new Date();
    let directUrl = item.link;
    let lastDate = null;
    
    try {
      const pageHtml = await fetchUrl(item.link);
      
      // Extract direct link
      directUrl = extractDirectLink(pageHtml, item.link, category);
      
      // Extract specific last date for jobs
      if (category === 'notice') {
        const lastDateMatch = /Last Date:\s*([0-9\/]+)/i.exec(pageHtml);
        if (lastDateMatch) lastDate = lastDateMatch[1].trim();
      }
      
      // Fallback/verify publish date from details page schema
      const schemaMatch = /"datePublished"\s*:\s*"([^"]*)"/i.exec(pageHtml);
      if (schemaMatch) {
        dateObj = new Date(schemaMatch[1]);
      }
    } catch (err) {
      console.error(`  Warning: Failed to fetch detail page for ${item.link}. Using feed metadata.`);
    }
    
    // Format dates
    const dateStr = formatPublishDate(dateObj);
    const publishDateStr = dateObj.toISOString().split('T')[0];
    
    // Use the actual publish time as createdAt timestamp, offset by index to ensure sorting
    const createdAtTimestamp = new Date(dateObj.getTime() - (i * 1000));
    
    // Insert into database
    await prisma.notice.create({
      data: {
        id,
        title: item.title,
        date: dateStr,
        publishDate: publishDateStr,
        type,
        category,
        url: directUrl,
        lastDate,
        createdAt: createdAtTimestamp
      }
    });
    
    console.log(`  Successfully imported: "${item.title}" -> Direct Link: ${directUrl}`);
    newNoticesCount++;
  }
  
  console.log(`Sync complete. Imported ${newNoticesCount} new notices.`);
}

if (require.main === module) {
  syncFeed()
    .catch(e => console.error("Sync Error:", e))
    .finally(() => {
      prisma.$disconnect();
      pool.end();
    });
} else {
  module.exports = { syncFeed, mapCategoryAndType, extractDirectLink };
}
