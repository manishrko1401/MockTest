const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Load .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).replace(/^["']|["']$/g, '').trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const bucketName = process.env.TIGRIS_BUCKET_NAME || 'mocktest-assets';
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.TIGRIS_ENDPOINT || 'https://fly.storage.tigris.dev',
  credentials: {
    accessKeyId: process.env.TIGRIS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.TIGRIS_SECRET_ACCESS_KEY || '',
  },
});

async function uploadNoticeHtmlToTigris(noticeId, htmlContent) {
  if (!htmlContent) return '';
  const cleanKey = `notices/html/${noticeId}.html`;
  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: cleanKey,
      Body: htmlContent,
      ContentType: 'text/html; charset=utf-8',
    }));
    return `tigris://${cleanKey}`;
  } catch (err) {
    console.error(`Tigris upload failed for [${noticeId}]:`, err.message);
    return null;
  }
}

function fetchUrl(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects < 0) return reject(new Error(`Too many redirects for ${url}`));
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8'
      },
      timeout: 15000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) {
          const u = new URL(url);
          redirectUrl = `${u.protocol}//${u.host}${redirectUrl}`;
        }
        return resolve(fetchUrl(redirectUrl, maxRedirects - 1));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
      });
    });
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
    req.on('error', err => reject(err));
  });
}

function formatPublishDate(date) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function extractDirectLink(pageHtml, defaultUrl, category) {
  const lowerHtml = pageHtml.toLowerCase();
  const importantLinksIdx = lowerHtml.indexOf('important link') !== -1 
    ? lowerHtml.indexOf('important link') 
    : lowerHtml.indexOf('useful link');
  if (importantLinksIdx === -1) return defaultUrl;

  const tableStart = pageHtml.lastIndexOf('<table', importantLinksIdx);
  const tableEnd = pageHtml.indexOf('</table>', importantLinksIdx);
  const tableArea = (tableStart !== -1 && tableEnd !== -1)
    ? pageHtml.substring(tableStart, tableEnd + 8)
    : pageHtml.substring(Math.max(0, importantLinksIdx - 100), importantLinksIdx + 15000);

  const trMatches = [...tableArea.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const rows = [];

  for (const tr of trMatches) {
    const rowHtml = tr[1];
    const tds = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(td => td[1]);
    if (tds.length >= 2) {
      const colText = tds[0].replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().toLowerCase();
      const aMatches = [...tds[1].matchAll(/href=["']([^"']*)["']/gi)];
      for (const a of aMatches) {
        const href = a[1].trim();
        if (href && href !== '#' && !href.startsWith('javascript:')) {
          rows.push({ text: colText, href });
        }
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
  } else if (category === 'answer_key') {
    primaryKeywords = ['download answer key', 'answer key', 'omr sheet', 'objection', 'key'];
    secondaryKeywords = ['download', 'login', 'website', 'official'];
  } else {
    primaryKeywords = ['apply online', 'online apply', 'online application', 'apply', 'registration', 'login'];
    secondaryKeywords = ['download notification', 'notification', 'website', 'official'];
  }

  const isValidDirectLink = (href) => {
    if (href.includes('youtu.be') || href.includes('youtube.com')) return false;
    if (/\/(?:result|admit-card|answer-key|recruitments|page|category|tag)\/?$/i.test(href)) return false;
    if (href === 'https://rojgarresult.com/' || href === 'https://www.sarkariresult.com/') return false;
    return true;
  };

  for (const keyword of primaryKeywords) {
    const match = rows.find(r => r.text.includes(keyword) && isValidDirectLink(r.href));
    if (match) return match.href;
  }

  for (const keyword of secondaryKeywords) {
    const match = rows.find(r => r.text.includes(keyword) && isValidDirectLink(r.href));
    if (match) return match.href;
  }

  const firstValid = rows.find(r => isValidDirectLink(r.href));
  if (firstValid) return firstValid.href;

  return defaultUrl;
}

function extractLastDate(html) {
  const tdRegex = /<td[^>]*>(?:Apply\s+Online\s+|Online\s+)?Last\s+Date(?:[^<]*)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i;
  const matchTd = tdRegex.exec(html);
  if (matchTd) {
    const value = matchTd[1].replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (value) return value;
  }
  const matchTxt = html.match(/Last\s*Date[^<\n\r]{0,40}[:\-]?\s*(?:<[^>]*>)*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i)
    || html.match(/Last\s*Date(?:(?!<\/li>)[\s\S])*?([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i);
  if (matchTxt) {
    return matchTxt[1].trim();
  }
  return null;
}

function extractNoticeContent(pageHtml) {
  if (!pageHtml) return null;

  let bodyHtml = pageHtml;
  const articleStart = pageHtml.indexOf('<article');
  if (articleStart !== -1) {
    let articleEnd = pageHtml.indexOf('</article>', articleStart);
    if (articleEnd === -1) articleEnd = pageHtml.length;
    else articleEnd += 10;
    bodyHtml = pageHtml.substring(articleStart, articleEnd);
  } else {
    const bodyStart = pageHtml.indexOf('<body');
    if (bodyStart !== -1) bodyHtml = pageHtml.substring(bodyStart);
  }

  const allowedBlocks = [];

  // A. Heading
  const headingMatch = /<h[12][^>]*>([\s\S]*?)<\/h[12]>/i.exec(bodyHtml);
  if (headingMatch) {
    let hText = headingMatch[1].replace(/<[^>]*>/g, '').trim();
    hText = hText.replace(/&amp;/g, '&').replace(/&#038;/g, '&').replace(/&#8211;/g, '-');
    if (hText && !/Rojgar\s*Result|Sarkari\s*Result/i.test(hText) && hText.length > 10) {
      allowedBlocks.push(`<h2 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white my-3">${hText}</h2>`);
    }
  }

  // B. Overview
  const pMatches = bodyHtml.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
  for (const p of pMatches) {
    const text = p.replace(/<[^>]*>/g, '').trim();
    if (
      (text.includes('released notification') || text.includes('invited online application') || text.includes('issued notification') || text.includes('has released') || text.includes('short details') || text.includes('Short Description') || text.includes('संक्षिप्त विवरण')) &&
      !text.startsWith('Post Update Date') &&
      !text.includes('Post Date') &&
      text.length > 40 &&
      text.length < 1500
    ) {
      let cleanP = p.replace(/<a[^>]*href=["'][^"']*(?:sarkariresult|rojgarresult)\.com[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi, '$1');
      cleanP = cleanP.replace(/(?:Sarkari|Rojgar)\s*Result®?\s*/gi, '').replace(/(?:sarkariresult|rojgarresult)\.com/gi, '').replace(/\.Com/gi, '');
      cleanP = cleanP.replace(/(?:<b>|<strong>)?\s*(?:Short\s*(?:Description|Details)|संक्षिप्त\s*विवरण)\s*:?\s*(?:<\/b>|<\/strong>)?\s*/gi, '<strong>Overview: </strong>');
      allowedBlocks.push(`<div class="notice-overview p-4 my-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-slate-800 dark:text-slate-200 text-sm leading-relaxed">${cleanP}</div>`);
      break;
    }
  }

  // C. Tables
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tMatch;

  while ((tMatch = tableRegex.exec(bodyHtml)) !== null) {
    const fullTable = tMatch[0];
    const tableContent = tMatch[1];
    const lower = tableContent.toLowerCase();

    const isUsefulLinks = lower.includes('useful important link') || lower.includes('important link') || lower.includes('useful link') || lower.includes('apply online') || lower.includes('download notification') || lower.includes('official website');
    const isImportantDates = lower.includes('important date') || lower.includes('application begin') || lower.includes('last date');
    const isApplicationFee = lower.includes('application fee') || lower.includes('exam fee') || lower.includes('general');
    const isAgeLimit = lower.includes('age limit') || lower.includes('minimum age') || lower.includes('maximum age');
    const isVacancyDetails = lower.includes('vacancy detail') || lower.includes('total post') || lower.includes('eligibility');
    const isCategoryVacancy = lower.includes('category wise') || lower.includes('category-wise') || lower.includes('post name');

    const isPureSocialMediaTable = !isUsefulLinks && !isImportantDates && !isApplicationFee && !isAgeLimit && !isVacancyDetails && !isCategoryVacancy &&
      (lower.includes('face book') || lower.includes('telegram') || lower.includes('whatsapp') || lower.includes('instagram') || lower.includes('android app') || lower.includes('twitter'));
    if (isPureSocialMediaTable) continue;

    const isSelectionProcedureOnly = !isUsefulLinks && (lower.includes('selection procedure') || lower.includes('selection process') || lower.includes('selection mode')) && !isVacancyDetails && !isImportantDates;
    const isHowToApplyOnly = !isUsefulLinks && (lower.includes('how to apply') || lower.includes('how to fill') || lower.includes('step to apply'));
    const isFaqOnly = !isUsefulLinks && (lower.includes('frequently asked questions') || lower.includes('important faqs') || lower.includes('faq:'));
    if (isSelectionProcedureOnly || isHowToApplyOnly || isFaqOnly) continue;

    if (isUsefulLinks || isImportantDates || isApplicationFee || isAgeLimit || isVacancyDetails || isCategoryVacancy) {
      let cleanTable = fullTable.replace(/\s*width=["']?\d+(?:px|%)?["']?/gi, '');
      
      if (!isUsefulLinks) {
        cleanTable = cleanTable.replace(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?(?:Watch\s*Video|Hindi\s*Video|Join\s*Free|Information\s*Channel|Official\s*Whatsapp|Whats-App|WhatsApp|Telegram|Instagram|Face\s*Book|You\s*Tube|Reels)(?:(?!<\/tr>)[\s\S])*?<\/tr>/gi, '');
      }
      
      cleanTable = cleanTable.replace(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?(?:www\s*\.\s*\.\s*com|\.Com|sarkariresult\.com|Sarkari\s*Result®?|rojgarresult\.com|Rojgar\s*Result®?)(?:(?!<\/tr>)[\s\S])*?<\/tr>/gi, (m) => {
        if (/<a\s+[^>]*href=["'](?!https?:\/\/(?:www\.)?(?:sarkariresult|rojgarresult)\.com\/?(?:$|[?#]))[^"']+["']/i.test(m)) {
          return m;
        }
        const text = m.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
        if (/^(?:www\s*\.\s*\.\s*com|\.Com|Website|Sarkari\s*Result®?|sarkariresult\.com|Rojgar\s*Result®?|rojgarresult\.com)$/i.test(text) || text.length < 15) {
          return '';
        }
        return m;
      });

      cleanTable = cleanTable.replace(/>([^<]*)(?:Sarkari\s*Result®?|sarkariresult\.com|Rojgar\s*Result®?|\.Com)([^<]*)</gi, '>$1$2<');
      cleanTable = cleanTable.replace(/<tr[^>]*>\s*(?:<td[^>]*>\s*(?:<[^>]*>\s*)*<\/td>\s*)*<\/tr>/gi, '');
      cleanTable = cleanTable.replace(/<a\s+(?!.*?target=)/gi, '<a target="_blank" rel="noopener noreferrer" ');

      const tableBody = cleanTable.replace(/^<table[^>]*>/i, '').replace(/<\/table>$/i, '');
      allowedBlocks.push(`<div class="notice-table-wrapper overflow-x-auto max-w-full my-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900"><table class="w-full text-left">${tableBody}</table></div>`);
    }
  }

  if (allowedBlocks.length === 0) return null;
  return allowedBlocks.join('\n\n');
}

const CATEGORIES = [
  { name: 'Latest Jobs', category: 'notice', type: 'JOB', prefix: 'job_', url: 'https://rojgarresult.com/recruitments/' },
  { name: 'Results', category: 'result', type: 'RESULT', prefix: 'res_', url: 'https://rojgarresult.com/result/' },
  { name: 'Admit Card', category: 'admit_card', type: 'ADMIT CARD', prefix: 'ac_', url: 'https://rojgarresult.com/admit-card/' },
  { name: 'Answer Key', category: 'answer_key', type: 'ANSWER KEY', prefix: 'ak_', url: 'https://rojgarresult.com/answer-key/' }
];

async function syncRojgarResult() {
  console.log('=== Syncing All Notifications and Useful Links from RojgarResult.com ===');
  let totalImported = 0;
  let totalUpdated = 0;

  for (const cat of CATEGORIES) {
    console.log(`\nFetching ${cat.name} from: ${cat.url}`);
    let catHtml = '';
    try {
      catHtml = await fetchUrl(cat.url);
    } catch (e) {
      console.error(`Failed to fetch ${cat.url}:`, e.message);
      continue;
    }

    const items = [];
    const seen = new Set();

    const h2Regex = /<h2[^>]*>\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = h2Regex.exec(catHtml)) !== null) {
      const rawHref = m[1].trim();
      const rawTitle = m[2]
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&#038;/g, '&')
        .replace(/&#8211;/g, '-')
        .replace(/\s+/g, ' ')
        .trim();

      if (
        rawHref.includes('rojgarresult.com') &&
        !rawHref.endsWith('/result/') &&
        !rawHref.endsWith('/admit-card/') &&
        !rawHref.endsWith('/answer-key/') &&
        !rawHref.endsWith('/recruitments/') &&
        !rawHref.includes('/page/') &&
        !rawHref.includes('/category/') &&
        !rawHref.includes('/tag/') &&
        rawTitle.length > 5
      ) {
        if (!seen.has(rawHref)) {
          seen.add(rawHref);
          items.push({ title: rawTitle, url: rawHref });
        }
      }
    }

    console.log(`Found ${items.length} notifications for ${cat.name}`);

    // Process top 30 most recent items per category to stay responsive
    const processItems = items.slice(0, 30);

    for (let i = 0; i < processItems.length; i++) {
      const item = processItems[i];
      const hash = crypto.createHash('md5').update(item.url).digest('hex').substring(0, 10);
      const noticeId = `${cat.prefix}${hash}`;

      try {
        console.log(`[${i + 1}/${processItems.length}] Processing: "${item.title}"`);
        const pageHtml = await fetchUrl(item.url);
        const directUrl = extractDirectLink(pageHtml, item.url, cat.category);
        const lastDate = extractLastDate(pageHtml);
        const contentHtml = extractNoticeContent(pageHtml);

        let dateObj = new Date();
        const schemaMatch = /"datePublished"\s*:\s*"([^"]*)"/i.exec(pageHtml);
        if (schemaMatch) {
          const parsedD = new Date(schemaMatch[1]);
          if (!isNaN(parsedD.getTime())) dateObj = parsedD;
        }

        const dateStr = formatPublishDate(dateObj);
        const publishDateStr = dateObj.toISOString().split('T')[0];

        let contentLink = null;
        if (contentHtml) {
          contentLink = await uploadNoticeHtmlToTigris(noticeId, contentHtml);
          if (!contentLink) contentLink = contentHtml;
        }

        const existing = await prisma.notice.findUnique({ where: { id: noticeId } });
        if (existing) {
          await prisma.notice.update({
            where: { id: noticeId },
            data: {
              title: item.title,
              date: dateStr,
              publishDate: publishDateStr,
              url: directUrl,
              rawUrl: item.url,
              lastDate: lastDate || existing.lastDate,
              contentHtml: contentLink || existing.contentHtml
            }
          });
          totalUpdated++;
        } else {
          await prisma.notice.create({
            data: {
              id: noticeId,
              title: item.title,
              date: dateStr,
              publishDate: publishDateStr,
              type: cat.type,
              category: cat.category,
              url: directUrl,
              rawUrl: item.url,
              lastDate,
              contentHtml: contentLink
            }
          });
          totalImported++;
        }
      } catch (err) {
        console.error(`Error processing ${item.url}:`, err.message);
      }
    }
  }

  console.log(`\n✅ Sync complete! Imported ${totalImported} new notices, updated ${totalUpdated} existing notices with complete Useful Important Links.`);
  await pool.end();
}

syncRojgarResult().catch(err => {
  console.error('Fatal sync error:', err);
  pool.end();
});
