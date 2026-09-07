const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

// 1. Load .env
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
  const key = `notices/${noticeId}.html`;
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: Buffer.from(htmlContent, 'utf-8'),
        ContentType: 'text/html; charset=utf-8',
        CacheControl: 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400'
      })
    );
    return `tigris://${bucketName}/${key}`;
  } catch (error) {
    console.error(`Tigris upload error for ${noticeId}:`, error.message);
    return null;
  }
}

async function fetchNoticeHtmlFromTigris(tigrisUrl) {
  try {
    let key = tigrisUrl.replace(/^tigris:\/\/[^\/]+\//, '');
    const cmd = new GetObjectCommand({ Bucket: bucketName, Key: key });
    const response = await s3Client.send(cmd);
    return await response.Body.transformToString('utf-8');
  } catch (e) {
    return null;
  }
}

function fetchUrl(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many redirects'));
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
        let loc = res.headers.location;
        if (!loc.startsWith('http')) loc = new URL(loc, url).href;
        return fetchUrl(loc, maxRedirects - 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP status ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function extractUsefulLinksBlock(html) {
  if (!html) return null;
  const lower = html.toLowerCase();
  let linksIdx = lower.indexOf('useful important link');
  if (linksIdx === -1) linksIdx = lower.indexOf('important link');
  if (linksIdx === -1) linksIdx = lower.indexOf('useful link');
  if (linksIdx === -1) return null;

  let blockStart = html.lastIndexOf('<table', linksIdx);
  const rowStart = html.lastIndexOf('<tr', linksIdx);
  if (blockStart === -1 || (rowStart !== -1 && linksIdx - rowStart < linksIdx - blockStart && linksIdx - rowStart < 400)) {
    blockStart = rowStart !== -1 ? rowStart : linksIdx;
  }

  let blockEnd = -1;
  const searchArea = html.substring(linksIdx, linksIdx + 25000);
  const closingTables = [...searchArea.matchAll(/<\/table>/gi)];
  if (closingTables.length > 0) {
    const lastClose = closingTables[closingTables.length - 1].index;
    blockEnd = linksIdx + lastClose + 8;
  } else {
    blockEnd = linksIdx + 8000;
  }

  let block = html.substring(blockStart, blockEnd);
  if (!block.startsWith('<table')) {
    block = '<table class="w-full text-left">' + block;
  }
  if (!block.endsWith('</table>')) {
    block = block + '</table>';
  }
  return block;
}

function extractDirectLink(html, defaultUrl, category) {
  const trMatches = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
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

  // A. HEADING
  const headingMatch = /<h[12][^>]*>([\s\S]*?)<\/h[12]>/i.exec(bodyHtml);
  if (headingMatch) {
    let hText = headingMatch[1].replace(/<[^>]*>/g, '').trim();
    hText = hText.replace(/&amp;/g, '&').replace(/&#038;/g, '&').replace(/&#8211;/g, '-');
    if (hText && !/Rojgar\s*Result|Sarkari\s*Result/i.test(hText) && hText.length > 10) {
      allowedBlocks.push(`<h2 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white my-3">${hText}</h2>`);
    }
  }

  // B. OVERVIEW SECTION
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

  // C. TABLES: Important Dates, Fees, Age Limit, Vacancy Details, Useful Links
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

  // D. RESCUE: Check if Useful Important Links was captured
  const hasUsefulLinksBlock = allowedBlocks.some(b => {
    const l = b.toLowerCase();
    return l.includes('useful important link') || l.includes('important link') || l.includes('useful link');
  });

  if (!hasUsefulLinksBlock) {
    const linksBlockHtml = extractUsefulLinksBlock(bodyHtml);
    if (linksBlockHtml) {
      let cleanLinks = linksBlockHtml.replace(/\s*width=["']?\d+(?:px|%)?["']?/gi, '');
      cleanLinks = cleanLinks.replace(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?(?:www\s*\.\s*\.\s*com|\.Com|sarkariresult\.com|Sarkari\s*Result®?|rojgarresult\.com|Rojgar\s*Result®?)(?:(?!<\/tr>)[\s\S])*?<\/tr>/gi, (m) => {
        if (/<a\s+[^>]*href=["'](?!https?:\/\/(?:www\.)?(?:sarkariresult|rojgarresult)\.com\/?(?:$|[?#]))[^"']+["']/i.test(m)) {
          return m;
        }
        const text = m.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
        if (/^(?:www\s*\.\s*\.\s*com|\.Com|Website|Sarkari\s*Result®?|sarkariresult\.com|Rojgar\s*Result®?|rojgarresult\.com)$/i.test(text) || text.length < 15) {
          return '';
        }
        return m;
      });
      cleanLinks = cleanLinks.replace(/>([^<]*)(?:Sarkari\s*Result®?|sarkariresult\.com|Rojgar\s*Result®?|\.Com)([^<]*)</gi, '>$1$2<');
      cleanLinks = cleanLinks.replace(/<a\s+(?!.*?target=)/gi, '<a target="_blank" rel="noopener noreferrer" ');
      const tableBody = cleanLinks.replace(/^<table[^>]*>/i, '').replace(/<\/table>$/i, '');
      allowedBlocks.push(`<div class="notice-table-wrapper overflow-x-auto max-w-full my-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900"><table class="w-full text-left">${tableBody}</table></div>`);
    }
  }

  if (allowedBlocks.length === 0) return null;
  return allowedBlocks.join('\n\n');
}

// Master Resync Loop
async function resyncAllPreviousRojgar(options = {}) {
  const { limit = 0, force = false, concurrency = 5 } = options;

  console.log('=== STARTING RESYNC OF ALL ROJGARRESULT NOTICES WITH USEFUL IMPORTANT LINKS ===');
  
  // Find all RojgarResult notices
  const allNotices = await prisma.notice.findMany({
    where: {
      OR: [
        { rawUrl: { contains: 'rojgarresult.com' } },
        { url: { contains: 'rojgarresult.com' } }
      ]
    },
    select: {
      id: true,
      title: true,
      rawUrl: true,
      url: true,
      category: true,
      contentHtml: true,
      lastDate: true,
      date: true
    },
    orderBy: { date: 'desc' },
    ...(limit > 0 ? { take: limit } : {})
  });

  console.log(`Found ${allNotices.length} total Rojgar notices in DB.`);

  // Filter those that need resyncing
  const toProcess = [];
  for (const n of allNotices) {
    if (force) {
      toProcess.push(n);
      continue;
    }

    let hasLinks = false;
    if (n.contentHtml && !n.contentHtml.startsWith('tigris://')) {
      hasLinks = n.contentHtml.toLowerCase().includes('important link') || n.contentHtml.toLowerCase().includes('useful link');
    }

    if (!hasLinks) {
      toProcess.push(n);
    }
  }

  console.log(`Notices queued for resync: ${toProcess.length}`);

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // Process with concurrency
  const queue = [...toProcess];
  const workers = Array(concurrency).fill(null).map(async (_, workerId) => {
    while (queue.length > 0) {
      const notice = queue.shift();
      if (!notice) break;

      const targetUrl = notice.rawUrl || notice.url;
      if (!targetUrl || !targetUrl.includes('rojgarresult.com')) {
        skippedCount++;
        continue;
      }

      // If stored in Tigris, check if it already has links unless forced
      if (!force && notice.contentHtml && notice.contentHtml.startsWith('tigris://')) {
        const tigrisHtml = await fetchNoticeHtmlFromTigris(notice.contentHtml);
        if (tigrisHtml && (tigrisHtml.toLowerCase().includes('important link') || tigrisHtml.toLowerCase().includes('useful link'))) {
          skippedCount++;
          continue;
        }
      }

      try {
        const pageHtml = await fetchUrl(targetUrl);
        const extracted = extractNoticeContent(pageHtml);

        if (!extracted) {
          console.warn(`[W${workerId}] Warning: No content extracted for ${notice.id} (${notice.title.substring(0, 30)})`);
          errorCount++;
          continue;
        }

        const directLink = extractDirectLink(pageHtml, targetUrl, notice.category || 'notice');
        const lastDate = extractLastDate(pageHtml);

        // Upload to Tigris
        let contentRef = extracted;
        const tigrisUrl = await uploadNoticeHtmlToTigris(notice.id, extracted);
        if (tigrisUrl) contentRef = tigrisUrl;

        // Update DB
        await prisma.notice.update({
          where: { id: notice.id },
          data: {
            contentHtml: contentRef,
            url: directLink,
            ...(lastDate && !notice.lastDate ? { lastDate } : {})
          }
        });

        successCount++;
        const hasLinks = extracted.toLowerCase().includes('important link') || extracted.toLowerCase().includes('useful link');
        if (successCount % 10 === 0 || successCount <= 5) {
          console.log(`[Progress ${successCount}/${toProcess.length}] Healed: [${notice.id}] ${notice.title.substring(0, 40)} | Links: ${hasLinks} | DirectLink: ${directLink !== targetUrl}`);
        }
      } catch (err) {
        errorCount++;
        console.error(`[W${workerId}] Error processing ${notice.id} (${targetUrl}):`, err.message);
      }
    }
  });

  await Promise.all(workers);

  console.log('\n=== RESYNC COMPLETE ===');
  console.log(`Successfully healed & updated: ${successCount}`);
  console.log(`Skipped (already had links): ${skippedCount}`);
  console.log(`Errors/Unreachable: ${errorCount}`);
}

const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 0;
const force = args.includes('--force');

resyncAllPreviousRojgar({ limit, force, concurrency: 6 })
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
