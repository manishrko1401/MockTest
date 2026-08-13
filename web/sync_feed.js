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

// Extract inner details from notification heading to Useful Important Links section
function extractNoticeContent(pageHtml) {
  if (!pageHtml) return null;

  const articleStart = pageHtml.indexOf('<article');
  let bodyHtml = pageHtml;

  if (articleStart !== -1) {
    let articleEnd = pageHtml.indexOf('</article>', articleStart);
    if (articleEnd === -1) articleEnd = articleStart + 60000;
    else articleEnd += 10;
    bodyHtml = pageHtml.substring(articleStart, articleEnd);

    const loopItemCount = (bodyHtml.match(/gb-loop-item/g) || []).length;
    if (loopItemCount > 5) return null;
  }

  const entryContentIdx = bodyHtml.indexOf('class="entry-content"');
  if (entryContentIdx !== -1) {
    const divStart = bodyHtml.lastIndexOf('<div', entryContentIdx);
    if (divStart !== -1) bodyHtml = bodyHtml.substring(divStart);
  }

  const allowedBlocks = [];

  // A. HEADING
  const headingMatch = /<h[12][^>]*>([\s\S]*?)<\/h[12]>/i.exec(bodyHtml);
  if (headingMatch) {
    let hText = headingMatch[1].replace(/<[^>]*>/g, '').trim();
    hText = hText.replace(/&amp;/g, '&').replace(/&#038;/g, '&').replace(/&#8211;/g, '-');
    if (hText && !/Rojgar\s*Result/i.test(hText) && hText.length > 10) {
      allowedBlocks.push(`<h2 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white my-3">${hText}</h2>`);
    }
  }

  // B. OVERVIEW SECTION
  const pMatches = bodyHtml.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
  for (const p of pMatches) {
    const text = p.replace(/<[^>]*>/g, '').trim();
    if (
      (text.includes('released notification') || text.includes('invited online application') || text.includes('issued notification') || text.includes('has released') || text.includes('short details') || text.includes('Short Description')) &&
      !text.startsWith('Post Update Date') &&
      !text.includes('Post Date') &&
      text.length > 40 &&
      text.length < 1500
    ) {
      let cleanP = p.replace(/<a[^>]*href=["'][^"']*rojgarresult\.com[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi, '$1');
      cleanP = cleanP.replace(/Rojgar\s*Result®?\s*/gi, '').replace(/rojgarresult\.com/gi, '').replace(/\.Com/gi, '');
      cleanP = cleanP.replace(/(?:<b>|<strong>)?\s*Short\s*Description\s*:?\s*(?:<\/b>|<\/strong>)?\s*/gi, '<strong>Overview: </strong>');
      allowedBlocks.push(`<div class="notice-overview p-4 my-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-slate-800 dark:text-slate-200 text-sm leading-relaxed">${cleanP}</div>`);
      break;
    }
  }

  // C. TABLES / SECTIONS ONLY
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tMatch;

  while ((tMatch = tableRegex.exec(bodyHtml)) !== null) {
    const fullTable = tMatch[0];
    const tableContent = tMatch[1];
    const lower = tableContent.toLowerCase();

    const isUsefulLinks = lower.includes('useful important link') || lower.includes('important link') || lower.includes('direct link') || lower.includes('apply online') || lower.includes('download notification') || lower.includes('official website');
    const isImportantDates = lower.includes('important date') || lower.includes('application begin') || lower.includes('last date for apply');
    const isApplicationFee = lower.includes('application fee') || lower.includes('exam fee') || lower.includes('general / obc');
    const isAgeLimit = lower.includes('age limit') || lower.includes('minimum age') || lower.includes('maximum age');
    const isVacancyDetails = lower.includes('vacancy detail') || lower.includes('total post') || lower.includes('eligibility');
    const isCategoryVacancy = lower.includes('category wise') || lower.includes('category-wise') || (lower.includes('post name') && (lower.includes('ur') || lower.includes('obc') || lower.includes('sc') || lower.includes('st')));

    const isPureSocialMediaTable = !isUsefulLinks && !isImportantDates && !isApplicationFee && !isAgeLimit && !isVacancyDetails && !isCategoryVacancy &&
      (lower.includes('face book') || lower.includes('telegram') || lower.includes('whatsapp') || lower.includes('instagram') || lower.includes('android app') || lower.includes('twitter'));

    if (isPureSocialMediaTable) continue;

    const isSelectionProcedureOnly = (lower.includes('selection procedure') || lower.includes('selection process') || lower.includes('selection mode')) && !isVacancyDetails && !isImportantDates;
    const isHowToApplyOnly = lower.includes('how to apply') || lower.includes('how to fill') || lower.includes('step to apply');
    const isFaqOnly = lower.includes('faq') || lower.includes('question') || lower.includes('answer');

    if (isSelectionProcedureOnly || isHowToApplyOnly || isFaqOnly) continue;

    if (isUsefulLinks || isImportantDates || isApplicationFee || isAgeLimit || isVacancyDetails || isCategoryVacancy) {
      let cleanTable = fullTable.replace(/\s*width=["']?\d+(?:px|%)?["']?/gi, '');
      cleanTable = cleanTable.replace(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?(?:Watch\s*Video|Hindi\s*Video|Short\s*Notification\s*\(?[\w\s]*Video|Join\s*Free\s*Information|Information\s*Channel|Official\s*Whatsapp|Whats-App|WhatsApp|Telegram|Instagram|Face\s*Book|You\s*Tube|Reels)(?:(?!<\/tr>)[\s\S])*?<\/tr>/gi, '');
      cleanTable = cleanTable.replace(/<a[^>]*>\s*(?:Rojgar\s*Result®?|rojgarresult\.com|\.Com)\s*<\/a>/gi, '');
      cleanTable = cleanTable.replace(/>([^<]*)(?:Rojgar\s*Result®?|rojgarresult\.com)([^<]*)</gi, '>$1$2<');
      cleanTable = cleanTable.replace(/<a\s+(?!.*?target=)/gi, '<a target="_blank" rel="noopener noreferrer" ');

      const tableBody = cleanTable.replace(/^<table[^>]*>/i, '').replace(/<\/table>$/i, '');
      allowedBlocks.push(`<div class="notice-table-wrapper overflow-x-auto max-w-full my-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900"><table class="w-full text-left">${tableBody}</table></div>`);
    }
  }

  if (allowedBlocks.length === 0) return null;
  return allowedBlocks.join('\n\n');
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

function parseAllNoticeLinks(html) {
  const aRegex = /<a[^>]*href=["'](https:\/\/rojgarresult\.com\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  const items = [];
  const seen = new Set();

  while ((match = aRegex.exec(html)) !== null) {
    const url = match[1].trim();
    let text = match[2]
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&#038;/g, '&')
      .replace(/&#8211;/g, '-')
      .replace(/&#8217;/g, "'")
      .replace(/&rsquo;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    if (
      !url ||
      url === 'https://rojgarresult.com/' ||
      url.includes('/page/') ||
      url.includes('/category/') ||
      url.includes('/tag/') ||
      url.includes('/result/') ||
      url.includes('/admit-card/') ||
      url.includes('/answer-key/') ||
      url.includes('/recruitments/') ||
      url.includes('/syllabus/') ||
      url.includes('/admission/') ||
      url.includes('/sarkari-yojna/') ||
      url.includes('/upcoming/') ||
      url.includes('/wp-content/') ||
      url.includes('/privacy') ||
      url.includes('/contact') ||
      url.includes('/about') ||
      url.includes('/disclaimer')
    ) {
      continue;
    }

    if (text.length < 4 || /^(?:click\s*here|link|view|open|details|server\s*\d*)$/i.test(text)) continue;

    const normUrl = url.toLowerCase().replace(/\/$/, '');
    if (!seen.has(normUrl)) {
      seen.add(normUrl);
      items.push({ title: text, url });
    }
  }

  return items;
}

function inferCategoryAndType(title, url, defaultCategory, defaultType, defaultPrefix) {
  const lowerTitle = title.toLowerCase();
  const lowerUrl = url.toLowerCase();

  if (lowerTitle.includes('result') || lowerUrl.includes('result')) {
    return { category: 'result', type: 'RESULT', prefix: 'res_' };
  }
  if (lowerTitle.includes('admit card') || lowerTitle.includes('call letter') || lowerTitle.includes('exam city') || lowerUrl.includes('admit')) {
    return { category: 'admit_card', type: 'ADMIT CARD', prefix: 'ac_' };
  }
  if (lowerTitle.includes('answer key') || lowerUrl.includes('answer-key') || lowerTitle.includes('key 202')) {
    return { category: 'answer_key', type: 'ANSWER KEY', prefix: 'ak_' };
  }

  return { category: defaultCategory, type: defaultType, prefix: defaultPrefix };
}

async function syncFeed() {
  console.log("Starting full feed sync across all RojgarResult sections...");
  
  const targets = [
    {
      name: 'Homepage Live Notices',
      url: 'https://rojgarresult.com/',
      category: 'notice',
      type: 'JOB',
      prefix: 'job_'
    },
    {
      name: 'Latest Jobs',
      url: 'https://rojgarresult.com/recruitments/',
      category: 'notice',
      type: 'JOB',
      prefix: 'job_'
    },
    {
      name: 'Result Archive',
      url: 'https://rojgarresult.com/result/',
      category: 'result',
      type: 'RESULT',
      prefix: 'res_'
    },
    {
      name: 'Admit Card Archive',
      url: 'https://rojgarresult.com/admit-card/',
      category: 'admit_card',
      type: 'ADMIT CARD',
      prefix: 'ac_'
    },
    {
      name: 'Answer Key Archive',
      url: 'https://rojgarresult.com/answer-key/',
      category: 'answer_key',
      type: 'ANSWER KEY',
      prefix: 'ak_'
    }
  ];

  let newNoticesCount = 0;
  let updatedNoticesCount = 0;
  let importedIndex = 0;

  for (const target of targets) {
    console.log(`Fetching section: ${target.name} (${target.url})...`);
    let html = '';
    try {
      html = await fetchUrl(target.url);
    } catch (err) {
      console.error(`Failed to fetch ${target.name}:`, err.message);
      continue;
    }

    const parsedItems = parseAllNoticeLinks(html);
    console.log(`Parsed ${parsedItems.length} notice links from ${target.name}.`);

    // Process all items in reverse (oldest first) so newest remain on top
    const itemsToCheck = [...parsedItems].reverse();

    for (const item of itemsToCheck) {
      const meta = inferCategoryAndType(item.title, item.url, target.category, target.type, target.prefix);
      const hash = crypto.createHash('md5').update(item.url).digest('hex').substring(0, 10);
      const id = `${meta.prefix}${hash}`;

      // Check if already exists in DB
      const existing = await prisma.notice.findUnique({
        where: { id }
      });

      if (existing) {
        if (existing.title !== item.title || !existing.contentHtml) {
          console.log(`Updating/Backfilling content for: "${existing.title}"`);

          let dateObj = new Date();
          let directUrl = item.url;
          let lastDate = existing.lastDate;
          let contentHtml = null;

          try {
            const pageHtml = await fetchUrl(item.url);
            directUrl = extractDirectLink(pageHtml, item.url, meta.category);
            contentHtml = extractNoticeContent(pageHtml);

            const parsedLastDate = extractLastDate(pageHtml);
            if (parsedLastDate) lastDate = parsedLastDate;

            const schemaMatch = /"datePublished"\s*:\s*"([^"]*)"/i.exec(pageHtml);
            if (schemaMatch) {
              dateObj = new Date(schemaMatch[1]);
            }
          } catch (err) {
            console.error(`  Warning: Failed to fetch detail page for updated notice ${item.url}.`);
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
              type: meta.type,
              category: meta.category,
              url: directUrl,
              rawUrl: item.url,
              lastDate,
              contentHtml,
              createdAt: createdAtTimestamp
            }
          });

          console.log(`  Updated notice inner details.`);
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
      let contentHtml = null;

      try {
        const pageHtml = await fetchUrl(item.url);
        directUrl = extractDirectLink(pageHtml, item.url, meta.category);
        contentHtml = extractNoticeContent(pageHtml);

        const parsedLastDate = extractLastDate(pageHtml);
        if (parsedLastDate) lastDate = parsedLastDate;

        const schemaMatch = /"datePublished"\s*:\s*"([^"]*)"/i.exec(pageHtml);
        if (schemaMatch) {
          dateObj = new Date(schemaMatch[1]);
        }
      } catch (err) {
        console.error(`  Warning: Failed to fetch detail page for ${item.url}. Using fallback.`);
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
          type: meta.type,
          category: meta.category,
          url: directUrl,
          rawUrl: item.url,
          lastDate,
          contentHtml,
          createdAt: createdAtTimestamp
        }
      });

      console.log(`  Successfully imported: "${item.title}" -> Direct Link: ${directUrl}`);
      newNoticesCount++;
      importedIndex++;
    }
  }

  console.log(`\nSync complete. Mapped and imported ${newNoticesCount} new notices, updated/backfilled ${updatedNoticesCount} notices.`);
};

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
