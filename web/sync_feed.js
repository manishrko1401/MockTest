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

// Function to extract Last Date from details page HTML
function extractLastDate(html) {
  // Pattern 1: Table cell structure
  // e.g., <td>Last Date</td><td ...>14/08/2026</td> or <td>Apply Online Last Date</td><td ...>District Wise</td>
  const tdRegex = /<td[^>]*>(?:Apply\s+Online\s+|Online\s+)?Last\s+Date(?:[^<]*)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i;
  const matchTd = tdRegex.exec(html);
  if (matchTd) {
    const value = matchTd[1].replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (value) return value;
  }

  // Pattern 2: Plain text with colon/dash
  const txtRegex = /Last\s+Date\s*[:\-]\s*([^<\n\r]+)/i;
  const matchTxt = txtRegex.exec(html);
  if (matchTxt) {
    const value = matchTxt[1].replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (value) return value;
  }

  return null;
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
  console.log("Starting full Rojgar Result sync from category pages...");
  
  const targets = [
    {
      name: 'Result',
      url: 'https://rojgarresult.com/result/',
      category: 'result',
      type: 'RESULT',
      prefix: 'res_'
    },
    {
      name: 'Admit Card',
      url: 'https://rojgarresult.com/admit-card/',
      category: 'admit_card',
      type: 'ADMIT CARD',
      prefix: 'ac_'
    },
    {
      name: 'Answer Key',
      url: 'https://rojgarresult.com/answer-key/',
      category: 'answer_key',
      type: 'ANSWER KEY',
      prefix: 'ak_'
    },
    {
      name: 'Latest Jobs',
      url: 'https://rojgarresult.com/recruitments/',
      category: 'notice',
      type: 'JOB',
      prefix: 'job_'
    }
  ];

  let newNoticesCount = 0;
  let updatedNoticesCount = 0;
  let importedIndex = 0;

  for (const target of targets) {
    console.log(`Fetching listing for ${target.name} from ${target.url}...`);
    let html = '';
    try {
      html = await fetchUrl(target.url);
    } catch (err) {
      console.error(`Failed to fetch category listing for ${target.name}:`, err.message);
      continue;
    }

    const parts = html.split('class="gb-loop-item');
    const parsedItems = [];
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const h2Match = /<h2[^>]*>([\s\S]+?)<\/h2>/i.exec(part);
      const hrefMatch = /href="([^"]+)"/i.exec(part);
      
      if (h2Match && hrefMatch) {
        const title = h2Match[1]
          .replace(/<[^>]*>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&#038;/g, '&')
          .replace(/&#8211;/g, '-')
          .replace(/\s+/g, ' ')
          .trim();
        const url = hrefMatch[1].trim();
        parsedItems.push({ title, url });
      }
    }

    console.log(`Parsed ${parsedItems.length} items from ${target.name} page.`);
    
    // Process the latest 40 items in reverse (oldest first)
    const itemsToCheck = parsedItems.slice(0, 40);
    itemsToCheck.reverse();

    for (const item of itemsToCheck) {
      // Hash URL for unique ID
      const hash = crypto.createHash('md5').update(item.url).digest('hex').substring(0, 10);
      const id = `${target.prefix}${hash}`;

      // Check if already exists in DB
      const existing = await prisma.notice.findUnique({
        where: { id }
      });

      if (existing) {
        if (existing.title !== item.title) {
          console.log(`Found UPDATED notice in ${target.name}: "${existing.title}" -> "${item.title}"`);
          console.log(`  Link: ${item.url}`);

          let dateObj = new Date();
          let directUrl = item.url;
          let lastDate = existing.lastDate;

          try {
            const pageHtml = await fetchUrl(item.url);
            directUrl = extractDirectLink(pageHtml, item.url, target.category);

            const parsedLastDate = extractLastDate(pageHtml);
            if (parsedLastDate) lastDate = parsedLastDate;

            const schemaMatch = /"datePublished"\s*:\s*"([^"]*)"/i.exec(pageHtml);
            if (schemaMatch) {
              dateObj = new Date(schemaMatch[1]);
            }
          } catch (err) {
            console.error(`  Warning: Failed to fetch detail page for updated notice ${item.url}. Using existing metadata where possible.`);
          }

          const dateStr = formatPublishDate(dateObj);
          const publishDateStr = dateObj.toISOString().split('T')[0];
          const createdAtTimestamp = new Date(Date.now() + (importedIndex * 1000));

          await prisma.notice.update({
            where: { id },
            data: {
              title: item.title,
              date: dateStr,
              publishDate: publishDateStr,
              url: directUrl,
              lastDate,
              createdAt: createdAtTimestamp
            }
          });

          console.log(`  Successfully updated: "${item.title}" -> Direct Link: ${directUrl}`);
          updatedNoticesCount++;
          importedIndex++;
        } else if (!existing.lastDate) {
          // Title same but lastDate is null — backfill lastDate from detail page
          console.log(`Backfilling lastDate for: "${existing.title.substring(0, 55)}"`);
          let lastDate = null;
          try {
            const pageHtml = await fetchUrl(item.url);
            lastDate = extractLastDate(pageHtml);
          } catch (err) {
            console.error(`  Warning: Failed to fetch detail page for ${item.url}.`);
          }
          const updateValue = lastDate || 'See Notification';
          await prisma.notice.update({
            where: { id },
            data: { lastDate: updateValue }
          });
          console.log(`  Backfilled lastDate: "${updateValue}"`);
          updatedNoticesCount++;
          importedIndex++;
        }
        continue;
      }

      console.log(`Found NEW notice in ${target.name}: "${item.title}"`);
      console.log(`  Link: ${item.url}`);

      let dateObj = new Date();
      let directUrl = item.url;
      let lastDate = null;

      try {
        const pageHtml = await fetchUrl(item.url);
        directUrl = extractDirectLink(pageHtml, item.url, target.category);

        const parsedLastDate = extractLastDate(pageHtml);
        if (parsedLastDate) lastDate = parsedLastDate;

        const schemaMatch = /"datePublished"\s*:\s*"([^"]*)"/i.exec(pageHtml);
        if (schemaMatch) {
          dateObj = new Date(schemaMatch[1]);
        }
      } catch (err) {
        console.error(`  Warning: Failed to fetch detail page for ${item.url}. Using default date metadata.`);
      }

      const dateStr = formatPublishDate(dateObj);
      const publishDateStr = dateObj.toISOString().split('T')[0];
      const createdAtTimestamp = new Date(Date.now() + (importedIndex * 1000));

      await prisma.notice.create({
        data: {
          id,
          title: item.title,
          date: dateStr,
          publishDate: publishDateStr,
          type: target.type,
          category: target.category,
          url: directUrl,
          lastDate,
          createdAt: createdAtTimestamp
        }
      });

      console.log(`  Successfully imported: "${item.title}" -> Direct Link: ${directUrl}`);
      newNoticesCount++;
      importedIndex++;
    }
  }

  console.log(`Sync complete. Mapped and imported ${newNoticesCount} new notices, updated ${updatedNoticesCount} notices.`);

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
