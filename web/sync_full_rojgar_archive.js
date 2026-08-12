const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlLine = envContent.split('\n').find(line => line.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine ? dbUrlLine.split('DATABASE_URL=')[1].replace(/"/g, '').trim() : null;

const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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

function extractNoticeContent(pageHtml) {
  if (!pageHtml) return null;

  let contentStart = -1;
  const entryHeaderIdx = pageHtml.indexOf('class="entry-header"');
  const entryContentIdx = pageHtml.indexOf('class="entry-content"');

  if (entryHeaderIdx !== -1) {
    contentStart = entryHeaderIdx;
    const headerTagIdx = pageHtml.lastIndexOf('<header', entryHeaderIdx);
    if (headerTagIdx !== -1) contentStart = headerTagIdx;
  } else if (entryContentIdx !== -1) {
    contentStart = entryContentIdx;
    const divTagIdx = pageHtml.lastIndexOf('<div', entryContentIdx);
    if (divTagIdx !== -1) contentStart = divTagIdx;
  } else {
    const h1Idx = pageHtml.indexOf('<h1');
    if (h1Idx !== -1) contentStart = h1Idx;
  }

  if (contentStart === -1) return null;

  let contentEnd = -1;
  let linksHeadingIdx = pageHtml.toLowerCase().indexOf('useful important links');
  if (linksHeadingIdx === -1 || linksHeadingIdx < contentStart) {
    linksHeadingIdx = pageHtml.toLowerCase().indexOf('important links');
  }

  if (linksHeadingIdx !== -1 && linksHeadingIdx > contentStart) {
    const tableEndIdx = pageHtml.indexOf('</table>', linksHeadingIdx);
    if (tableEndIdx !== -1) {
      contentEnd = tableEndIdx + 8;
    }
  }

  if (contentEnd === -1) {
    const faqIdx = pageHtml.toLowerCase().indexOf('important faqs');
    if (faqIdx !== -1 && faqIdx > contentStart) {
      contentEnd = faqIdx;
    } else {
      const articleEndIdx = pageHtml.indexOf('</article>', contentStart);
      if (articleEndIdx !== -1) {
        contentEnd = articleEndIdx;
      } else {
        contentEnd = contentStart + 15000;
      }
    }
  }

  let extracted = pageHtml.substring(contentStart, contentEnd);

  extracted = extracted.replace(/<ins[^>]*class=["']adsbygoogle["'][\s\S]*?<\/ins>/gi, '');
  extracted = extracted.replace(/<script[\s\S]*?<\/script>/gi, '');
  extracted = extracted.replace(/<div[^>]*class=["']rr-people-viewed["'][\s\S]*?<\/div>/gi, '');
  extracted = extracted.replace(/<table[^>]*>[\s\S]*?(?:Face\s*Book|Telegram\s*Channel|WhatsApp\s*Channel|Instagram\s*Reels)[\s\S]*?<\/table>/gi, '');
  extracted = extracted.replace(/<a\s+(?!.*?target=)/gi, '<a target="_blank" rel="noopener noreferrer" ');

  return extracted.trim();
}

function extractLastDate(html) {
  const tdRegex = /<td[^>]*>(?:Apply\s+Online\s+|Online\s+)?Last\s+Date(?:[^<]*)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i;
  const matchTd = tdRegex.exec(html);
  if (matchTd) {
    const value = matchTd[1].replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (value) return value;
  }
  const txtRegex = /Last\s+Date\s*[:\-]\s*([^<\n\r]+)/i;
  const matchTxt = txtRegex.exec(html);
  if (matchTxt) {
    const value = matchTxt[1].replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (value) return value;
  }
  return null;
}

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

async function syncFullRojgarArchive() {
  console.log("Starting full Rojgar Result multi-page archive crawl...");

  const targets = [
    { name: 'Result', baseUrl: 'https://rojgarresult.com/result/', category: 'result', type: 'RESULT', prefix: 'res_' },
    { name: 'Admit Card', baseUrl: 'https://rojgarresult.com/admit-card/', category: 'admit_card', type: 'ADMIT CARD', prefix: 'ac_' },
    { name: 'Answer Key', baseUrl: 'https://rojgarresult.com/answer-key/', category: 'answer_key', type: 'ANSWER KEY', prefix: 'ak_' },
    { name: 'Latest Jobs', baseUrl: 'https://rojgarresult.com/recruitments/', category: 'notice', type: 'JOB', prefix: 'job_' }
  ];

  let totalFetchedCount = 0;
  let updatedCount = 0;
  let createdCount = 0;

  for (const target of targets) {
    console.log(`\n=== Processing Category: ${target.name} ===`);
    
    // Crawl pages 1 to 5 for each category
    for (let page = 1; page <= 5; page++) {
      const pageUrl = page === 1 ? target.baseUrl : `${target.baseUrl}page/${page}/`;
      console.log(`Fetching listing page ${page}: ${pageUrl}...`);

      let listingHtml = '';
      try {
        listingHtml = await fetchUrl(pageUrl);
      } catch (err) {
        console.log(`End of pages or error fetching ${pageUrl}:`, err.message);
        break;
      }

      const parts = listingHtml.split('class="gb-loop-item');
      const items = [];
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
          items.push({ title, url });
        }
      }

      console.log(`  Page ${page}: Parsed ${items.length} notice items.`);
      if (items.length === 0) break;

      for (const item of items) {
        totalFetchedCount++;
        const hash = crypto.createHash('md5').update(item.url).digest('hex').substring(0, 10);
        const id = `${target.prefix}${hash}`;

        // Check if existing in DB by ID or Title
        let existing = await prisma.notice.findUnique({ where: { id } });
        if (!existing) {
          existing = await prisma.notice.findFirst({ where: { title: item.title } });
        }

        if (existing && existing.contentHtml) {
          // Already has inner contentHtml!
          continue;
        }

        console.log(`  Fetching inner detail page for: "${item.title.substring(0, 45)}..." -> ${item.url}`);

        let dateObj = new Date();
        let directUrl = item.url;
        let lastDate = existing ? existing.lastDate : null;
        let contentHtml = null;

        try {
          const pageHtml = await fetchUrl(item.url);
          directUrl = extractDirectLink(pageHtml, item.url, target.category);
          contentHtml = extractNoticeContent(pageHtml);
          const parsedLastDate = extractLastDate(pageHtml);
          if (parsedLastDate) lastDate = parsedLastDate;

          const schemaMatch = /"datePublished"\s*:\s*"([^"]*)"/i.exec(pageHtml);
          if (schemaMatch) {
            dateObj = new Date(schemaMatch[1]);
          }
        } catch (err) {
          console.error(`    Warning: Failed to fetch detail page ${item.url}:`, err.message);
        }

        const dateStr = formatPublishDate(dateObj);
        const publishDateStr = dateObj.toISOString().split('T')[0];

        if (existing) {
          await prisma.notice.update({
            where: { id: existing.id },
            data: {
              title: item.title,
              date: dateStr,
              publishDate: publishDateStr,
              url: directUrl,
              rawUrl: item.url,
              lastDate,
              contentHtml
            }
          });
          updatedCount++;
          console.log(`    Successfully updated inner contentHtml for ID ${existing.id}`);
        } else {
          await prisma.notice.create({
            data: {
              id,
              title: item.title,
              date: dateStr,
              publishDate: publishDateStr,
              type: target.type,
              category: target.category,
              url: directUrl,
              rawUrl: item.url,
              lastDate,
              contentHtml
            }
          });
          createdCount++;
          console.log(`    Successfully created NEW notice with inner contentHtml ID ${id}`);
        }
      }
    }
  }

  console.log(`\n==================================================`);
  console.log(`Full Archive Crawl & Sync Complete!`);
  console.log(`Total listing items checked: ${totalFetchedCount}`);
  console.log(`Updated with contentHtml: ${updatedCount}`);
  console.log(`Created with contentHtml: ${createdCount}`);
  console.log(`==================================================`);

  await prisma.$disconnect();
}

syncFullRojgarArchive();
