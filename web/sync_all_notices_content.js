const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const https = require('https');

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

async function syncAllNoticesContent() {
  const forceResync = process.argv.includes('--force');
  
  if (forceResync) {
    console.log("FORCE MODE: Re-syncing ALL notices with rawUrl (re-extracting complete content)...");
  } else {
    console.log("Fetching all notices from database that lack inner contentHtml...");
  }

  const noticesToUpdate = await prisma.notice.findMany({
    where: forceResync
      ? { rawUrl: { not: null } }
      : { contentHtml: null }
  });

  console.log(`Found ${noticesToUpdate.length} notices to ${forceResync ? 're-sync' : 'update'}.`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const notice of noticesToUpdate) {
    let detailUrl = notice.rawUrl;
    if (!detailUrl && notice.url && notice.url.includes('rojgarresult.com')) {
      detailUrl = notice.url;
    }

    if (!detailUrl) {
      skippedCount++;
      continue;
    }

    console.log(`[${updatedCount + 1}/${noticesToUpdate.length}] Fetching: "${notice.title.substring(0, 45)}..." -> ${detailUrl}`);

    try {
      const pageHtml = await fetchUrl(detailUrl);
      const contentHtml = extractNoticeContent(pageHtml);
      const directUrl = extractDirectLink(pageHtml, notice.url || detailUrl, notice.category);
      const parsedLastDate = extractLastDate(pageHtml);
      const lastDate = parsedLastDate || notice.lastDate;

      await prisma.notice.update({
        where: { id: notice.id },
        data: {
          contentHtml,
          rawUrl: detailUrl,
          url: directUrl,
          lastDate
        }
      });

      console.log(`  Saved inner details (${contentHtml ? contentHtml.length : 0} chars).`);
      updatedCount++;
    } catch (err) {
      console.error(`  Failed to fetch ${detailUrl}:`, err.message);
      skippedCount++;
    }
  }

  console.log(`\nAll Notices Sync Complete! Successfully updated ${updatedCount} notices. Skipped ${skippedCount} notices.`);
  await prisma.$disconnect();
}

syncAllNoticesContent();

