require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const dbUrl = process.env.DATABASE_URL;
const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const bucketName = process.env.TIGRIS_BUCKET_NAME || 'mocktest-assets';
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.TIGRIS_ENDPOINT || 'https://fly.storage.tigris.dev',
  credentials: {
    accessKeyId: process.env.TIGRIS_ACCESS_KEY_ID,
    secretAccessKey: process.env.TIGRIS_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

async function uploadToTigris(noticeId, htmlContent) {
  if (!htmlContent) return '';
  const cleanKey = `notices/html/${noticeId}.html`;
  await s3Client.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: cleanKey,
    Body: htmlContent,
    ContentType: 'text/html; charset=utf-8',
  }));
  return `tigris://${cleanKey}`;
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

async function healAllNotices() {
  console.log("=== STARTING FULL NOTICE HEAL & TIGRIS RESYNC ===\n");

  const notices = await prisma.notice.findMany({
    select: { id: true, title: true, rawUrl: true, url: true, category: true, contentHtml: true }
  });

  console.log(`Found ${notices.length} notices in database.`);

  let healedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < notices.length; i++) {
    const notice = notices[i];
    const fetchUrlStr = notice.rawUrl || (notice.url && notice.url.includes('rojgarresult.com') ? notice.url : null);

    if (!fetchUrlStr) {
      skippedCount++;
      continue;
    }

    try {
      const res = await fetch(fetchUrlStr, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const pageHtml = await res.text();
      const extractedHtml = extractNoticeContent(pageHtml);

      if (extractedHtml && extractedHtml.length > 300) {
        const tigrisRef = await uploadToTigris(notice.id, extractedHtml);
        const lastDate = extractLastDate(pageHtml);

        await prisma.notice.update({
          where: { id: notice.id },
          data: {
            contentHtml: tigrisRef,
            ...(lastDate ? { lastDate } : {})
          }
        });

        const tableCount = (extractedHtml.match(/<table/gi) || []).length;
        console.log(`[${i + 1}/${notices.length}] ✅ Healed: "${notice.title.substring(0, 40)}..." -> ${extractedHtml.length}b, ${tableCount} tables`);
        healedCount++;
      } else {
        console.log(`[${i + 1}/${notices.length}] ⚠️ Skipping: "${notice.title.substring(0, 40)}..." (extracted HTML too short or invalid)`);
        skippedCount++;
      }
    } catch (err) {
      console.error(`[${i + 1}/${notices.length}] ❌ Error processing ${notice.id}:`, err.message);
      errorCount++;
    }
  }

  console.log(`\n🎉 HEAL & RESYNC COMPLETE!`);
  console.log(`- Total processed: ${notices.length}`);
  console.log(`- Successfully healed & saved to Tigris: ${healedCount}`);
  console.log(`- Skipped: ${skippedCount}`);
  console.log(`- Errors: ${errorCount}`);

  await prisma.$disconnect();
}

healAllNotices().catch(console.error);
