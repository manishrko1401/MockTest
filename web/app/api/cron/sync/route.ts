import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { uploadNoticeHtmlToTigris } from '../../../lib/tigrisNoticeStorage';
import crypto from 'crypto';

// Vercel Hobby plan allows up to 60s per function invocation.
export const maxDuration = 60;

// Format date to: 30 June 2026
function formatPublishDate(date: Date): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Function to extract direct apply/download link from details page HTML
function extractDirectLink(pageHtml: string, defaultUrl: string, category: string): string {
  const importantLinksIdx = pageHtml.toLowerCase().indexOf('important link') !== -1 
    ? pageHtml.toLowerCase().indexOf('important link') 
    : pageHtml.toLowerCase().indexOf('useful link');
  if (importantLinksIdx === -1) return defaultUrl;

  const tableArea = pageHtml.substring(Math.max(0, importantLinksIdx - 50), importantLinksIdx + 6000);
  const trMatches = [...tableArea.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const rows: { text: string; href: string }[] = [];

  for (const tr of trMatches) {
    const rowHtml = tr[1];
    const tds = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(td => td[1]);
    if (tds.length >= 2) {
      const colText = tds[0].replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().toLowerCase();
      const hrefMatch = /href=["']([^"']*)["']/i.exec(tds[1]);
      if (hrefMatch) {
        const href = hrefMatch[1].trim();
        rows.push({ text: colText, href });
      }
    }
  }

  let primaryKeywords: string[] = [];
  let secondaryKeywords: string[] = [];

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
    // Jobs/notices
    primaryKeywords = ['apply online', 'online apply', 'online application', 'apply', 'registration', 'login'];
    secondaryKeywords = ['download notification', 'notification', 'website', 'official'];
  }

  for (const keyword of primaryKeywords) {
    const match = rows.find(r => r.text.includes(keyword) && !r.href.includes('youtu.be') && !r.href.includes('sarkariresult.com') && !r.href.includes('rojgarresult.com'));
    if (match) return match.href;
  }

  for (const keyword of secondaryKeywords) {
    const match = rows.find(r => r.text.includes(keyword) && !r.href.includes('youtu.be') && !r.href.includes('sarkariresult.com') && !r.href.includes('rojgarresult.com'));
    if (match) return match.href;
  }

  const firstValid = rows.find(r => !r.href.includes('youtu.be') && !r.href.includes('sarkariresult.com') && !r.href.includes('rojgarresult.com'));
  if (firstValid) return firstValid.href;

  return defaultUrl;
}

// Function to extract Last Date from details page HTML
function extractLastDate(html: string): string | null {
  // Pattern 1: Table cell structure
  const tdRegex = /<td[^>]*>(?:Apply\s+Online\s+|Online\s+)?Last\s+Date(?:[^<]*)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i;
  const matchTd = tdRegex.exec(html);
  if (matchTd) {
    const value = matchTd[1].replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (value) return value;
  }

  // Pattern 2: Regex for Last Date in text/list item
  const matchTxt = html.match(/Last\s*Date[^<\n\r]{0,40}[:\-]?\s*(?:<[^>]*>)*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i)
    || html.match(/Last\s*Date(?:(?!<\/li>)[\s\S])*?([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i);
  if (matchTxt) {
    return matchTxt[1].trim();
  }

  return null;
}

// Extract ONLY specified target sections (Heading, Overview, Important Dates, Application Fees, Age Limit, Vacancy Details, Category Wise Vacancy Details, Useful Important Links)
function extractNoticeContent(pageHtml: string): string | null {
  if (!pageHtml) return null;

  let bodyHtml = pageHtml;
  const articleStart = pageHtml.indexOf('<article');
  if (articleStart !== -1) {
    let articleEnd = pageHtml.indexOf('</article>', articleStart);
    if (articleEnd === -1) articleEnd = articleStart + 60000;
    else articleEnd += 10;
    bodyHtml = pageHtml.substring(articleStart, articleEnd);
  } else {
    const bodyStart = pageHtml.indexOf('<body');
    if (bodyStart !== -1) bodyHtml = pageHtml.substring(bodyStart);
  }

  const allowedBlocks: string[] = [];

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
  let tMatch: RegExpExecArray | null;

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

    // Skip pure social media tables
    const isPureSocialMediaTable = !isUsefulLinks && !isImportantDates && !isApplicationFee && !isAgeLimit && !isVacancyDetails && !isCategoryVacancy &&
      (lower.includes('face book') || lower.includes('telegram') || lower.includes('whatsapp') || lower.includes('instagram') || lower.includes('android app') || lower.includes('twitter'));
    if (isPureSocialMediaTable) continue;

    const isSelectionProcedureOnly = (lower.includes('selection procedure') || lower.includes('selection process') || lower.includes('selection mode')) && !isVacancyDetails && !isImportantDates;
    const isHowToApplyOnly = lower.includes('how to apply') || lower.includes('how to fill') || lower.includes('step to apply');
    const isFaqOnly = lower.includes('faq') || lower.includes('question') || lower.includes('answer');
    if (isSelectionProcedureOnly || isHowToApplyOnly || isFaqOnly) continue;

    if (isUsefulLinks || isImportantDates || isApplicationFee || isAgeLimit || isVacancyDetails || isCategoryVacancy) {
      let cleanTable = fullTable.replace(/\s*width=["']?\d+(?:px|%)?["']?/gi, '');
      
      // Strip social media rows
      cleanTable = cleanTable.replace(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?(?:Watch\s*Video|Hindi\s*Video|Join\s*Free|Information\s*Channel|Official\s*Whatsapp|Whats-App|WhatsApp|Telegram|Instagram|Face\s*Book|You\s*Tube|Reels)(?:(?!<\/tr>)[\s\S])*?<\/tr>/gi, '');
      
      // Strip purely branding rows
      cleanTable = cleanTable.replace(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?(?:www\s*\.\s*\.\s*com|\.Com|sarkariresult\.com|Sarkari\s*Result®?|rojgarresult\.com|Rojgar\s*Result®?)(?:(?!<\/tr>)[\s\S])*?<\/tr>/gi, (m) => {
        const text = m.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
        if (/^(?:www\s*\.\s*\.\s*com|\.Com|Website|Sarkari\s*Result®?|sarkariresult\.com|Rojgar\s*Result®?|rojgarresult\.com)$/i.test(text) || text.length < 15) {
          return '';
        }
        return m;
      });

      // Strip branding inside text nodes
      cleanTable = cleanTable.replace(/>([^<]*)(?:Sarkari\s*Result®?|sarkariresult\.com|Rojgar\s*Result®?|rojgarresult\.com|\.Com)([^<]*)</gi, '>$1$2<');
      cleanTable = cleanTable.replace(/<tr[^>]*>\s*(?:<td[^>]*>\s*(?:<[^>]*>\s*)*<\/td>\s*)*<\/tr>/gi, '');
      cleanTable = cleanTable.replace(/<a\s+(?!.*?target=)/gi, '<a target="_blank" rel="noopener noreferrer" ');

      const tableBody = cleanTable.replace(/^<table[^>]*>/i, '').replace(/<\/table>$/i, '');
      allowedBlocks.push(`<div class="notice-table-wrapper overflow-x-auto max-w-full my-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900"><table class="w-full text-left">${tableBody}</table></div>`);
    }
  }

  if (allowedBlocks.length === 0) return null;
  return allowedBlocks.join('\n\n');
}

// Helper to fetch text with standard headers
async function fetchUrl(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8'
    },
    next: { revalidate: 0 }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}, status: ${response.status}`);
  }
  return await response.text();
}

type TargetCategory = {
  name: string;
  category: string;
  type: string;
  prefix: string;
};

const CATEGORY_CONFIG: TargetCategory[] = [
  { name: 'Result', category: 'result', type: 'RESULT', prefix: 'res_' },
  { name: 'Admit Card', category: 'admit_card', type: 'ADMIT CARD', prefix: 'ac_' },
  { name: 'Latest Jobs', category: 'notice', type: 'JOB', prefix: 'job_' },
  { name: 'Answer Key', category: 'answer_key', type: 'ANSWER KEY', prefix: 'ak_' }
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const authHeader = request.headers.get('authorization');
    const isAuthorized = !process.env.CRON_SECRET ||
      secret === process.env.CRON_SECRET ||
      authHeader === `Bearer ${process.env.CRON_SECRET}` ||
      request.method === 'POST';

    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.log("Cron Sync started...");
    
    let newNoticesCount = 0;
    let updatedNoticesCount = 0;
    const importedTitles: string[] = [];
    const updatedTitles: string[] = [];
    let importedIndex = 0;

    const runStartedAt = Date.now();
    const DEADLINE_MS = 50_000;
    const timeLeft = () => DEADLINE_MS - (Date.now() - runStartedAt);

    type WorkItem = { id: string; title: string; url: string; isUpdate: boolean; existingLastDate?: string | null };
    type CategoryQueue = { target: TargetCategory; queue: WorkItem[] };

    const categoryQueues: CategoryQueue[] = [];
    const listingErrors: Record<string, string> = {};

    // 1. Fetch live notices from SarkariResult (all 4 categories in one request)
    let homeHtml = '';
    try {
      homeHtml = await fetchUrl('https://www.sarkariresult.com/');
    } catch (err: any) {
      console.error('Failed to fetch sarkariresult homepage:', err.message);
      listingErrors['SarkariResultHome'] = err.message;
    }

    const quickLists = homeHtml ? homeHtml.split('<ul class="sarkari-quick-list">') : [];

    for (let idx = 0; idx < CATEGORY_CONFIG.length; idx++) {
      const target = CATEGORY_CONFIG[idx];
      const parsedItems: { title: string; url: string }[] = [];

      // Look at quickLists[idx + 1] from SarkariResult homepage
      if (quickLists.length > idx + 1) {
        const listContent = quickLists[idx + 1].split('</ul>')[0] || '';
        const regex = /<li[^>]*><a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
        let match;
        while ((match = regex.exec(listContent)) !== null) {
          const rawHref = match[1].trim();
          const rawTitle = match[2]
            .replace(/&amp;/g, '&')
            .replace(/&#038;/g, '&')
            .replace(/&#8211;/g, '-')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (rawHref.includes('sarkariresult.com') && rawTitle.length > 5) {
            parsedItems.push({ title: rawTitle, url: rawHref });
          }
        }
      }

      // Fallback: If SarkariResult listing didn't produce items, try RojgarResult as backup
      if (parsedItems.length === 0) {
        const fallbackUrls: Record<string, string> = {
          'result': 'https://rojgarresult.com/result/',
          'admit_card': 'https://rojgarresult.com/admit-card/',
          'answer_key': 'https://rojgarresult.com/answer-key/',
          'notice': 'https://rojgarresult.com/recruitments/'
        };
        const fbUrl = fallbackUrls[target.category];
        if (fbUrl) {
          try {
            const fbHtml = await fetchUrl(fbUrl);
            const parts = fbHtml.split('class="gb-loop-item');
            for (let i = 1; i < parts.length; i++) {
              const h2Match = /<h2[^>]*>([\s\S]+?)<\/h2>/i.exec(parts[i]);
              if (h2Match) {
                const hrefInH2 = /href="([^"]+)"/i.exec(h2Match[1]);
                if (hrefInH2 && hrefInH2[1].includes('rojgarresult.com')) {
                  const title = h2Match[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
                  parsedItems.push({ title, url: hrefInH2[1].trim() });
                }
              }
            }
          } catch (e: any) {
            listingErrors[target.name] = e.message;
          }
        }
      }

      console.log(`Cron: Parsed ${parsedItems.length} items for ${target.name}`);

      // Deduplicate by URL so repeated links never collide
      const uniqueItems: { title: string; url: string }[] = [];
      const seenUrls = new Set<string>();
      for (const item of parsedItems) {
        if (!seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          uniqueItems.push(item);
        }
      }

      const idsByUrl = new Map<string, string>();
      for (const item of uniqueItems) {
        const hash = crypto.createHash('md5').update(item.url).digest('hex').substring(0, 10);
        idsByUrl.set(item.url, `${target.prefix}${hash}`);
      }

      const existingRecords = await prisma.notice.findMany({
        where: { id: { in: Array.from(idsByUrl.values()) } },
        select: { id: true, title: true, contentHtml: true, lastDate: true }
      });
      const existingById = new Map(existingRecords.map(r => [r.id, r]));

      const queue: WorkItem[] = [];
      for (const item of uniqueItems) {
        const id = idsByUrl.get(item.url)!;
        const existing = existingById.get(id);
        if (existing) {
          if (existing.title !== item.title || !existing.contentHtml) {
            queue.push({ id, title: item.title, url: item.url, isUpdate: true, existingLastDate: existing.lastDate });
          }
        } else {
          queue.push({ id, title: item.title, url: item.url, isUpdate: false });
        }
      }

      // Process oldest first
      queue.reverse();
      console.log(`Cron: ${target.name} needs ${queue.length} new/updated notice(s) out of ${uniqueItems.length} unique parsed`);
      categoryQueues.push({ target, queue });
    }

    // Round-robin across categories within execution deadline
    let madeProgress = true;
    while (madeProgress && timeLeft() > 0) {
      madeProgress = false;
      for (const cq of categoryQueues) {
        if (timeLeft() <= 0) break;
        const work = cq.queue.shift();
        if (!work) continue;
        madeProgress = true;

        const target = cq.target;
        let dateObj = new Date();
        let directUrl = work.url;
        let lastDate: string | null = work.existingLastDate ?? null;
        let contentHtml: string | null = null;

        try {
          const pageHtml = await fetchUrl(work.url);
          directUrl = extractDirectLink(pageHtml, work.url, target.category);
          contentHtml = extractNoticeContent(pageHtml);

          const parsedLastDate = extractLastDate(pageHtml);
          if (parsedLastDate) lastDate = parsedLastDate;

          const schemaMatch = /"datePublished"\s*:\s*"([^"]*)"/i.exec(pageHtml);
          if (schemaMatch) {
            const parsedD = new Date(schemaMatch[1]);
            if (!isNaN(parsedD.getTime())) {
              dateObj = parsedD;
            }
          }
        } catch (err: any) {
          console.error(`Cron: Warning: Failed to fetch detail page for ${work.url}:`, err.message);
        }

        const dateStr = formatPublishDate(dateObj);
        const publishDateStr = dateObj.toISOString().split('T')[0];
        const createdAtTimestamp = new Date(Date.now() + (importedIndex * 1000));

        let contentLink: string | null = null;
        if (contentHtml) {
          try {
            contentLink = await uploadNoticeHtmlToTigris(work.id, contentHtml);
          } catch (e: any) {
            console.error(`Failed to upload notice ${work.id} HTML to Tigris:`, e.message);
            contentLink = contentHtml;
          }
        }

        try {
          if (work.isUpdate) {
            console.log(`Cron: Updating ${target.name}: "${work.title}"`);
            await prisma.notice.update({
              where: { id: work.id },
              data: {
                title: work.title,
                date: dateStr,
                publishDate: publishDateStr,
                url: directUrl,
                rawUrl: work.url,
                lastDate,
                contentHtml: contentLink,
                createdAt: createdAtTimestamp
              }
            });
            updatedNoticesCount++;
            updatedTitles.push(work.title);
          } else {
            console.log(`Cron: Found NEW ${target.name}: "${work.title}"`);
            await prisma.notice.upsert({
              where: { id: work.id },
              update: {
                title: work.title,
                date: dateStr,
                publishDate: publishDateStr,
                url: directUrl,
                rawUrl: work.url,
                lastDate,
                contentHtml: contentLink
              },
              create: {
                id: work.id,
                title: work.title,
                date: dateStr,
                publishDate: publishDateStr,
                type: target.type,
                category: target.category,
                url: directUrl,
                rawUrl: work.url,
                lastDate,
                contentHtml: contentLink,
                createdAt: createdAtTimestamp
              }
            });
            newNoticesCount++;
            importedTitles.push(work.title);
          }
        } catch (dbErr: any) {
          console.error(`Cron: Database error saving notice ${work.id} ("${work.title}"):`, dbErr.message);
        }
        importedIndex++;
      }
    }

    const remainingBacklog = categoryQueues.reduce((sum, cq) => sum + cq.queue.length, 0);
    if (remainingBacklog > 0) {
      console.log(`Cron: Deadline reached with ${remainingBacklog} notice(s) still queued; they'll be picked up on the next run.`);
    }

    if (newNoticesCount > 0 || updatedNoticesCount > 0) {
      if ((global as any).catalogCache) {
        (global as any).catalogCache.noticesList = null;
        (global as any).catalogCache.noticesLastFetched = null;
      }
    }

    return NextResponse.json({
      success: true,
      message: remainingBacklog > 0
        ? `Sync complete. Imported ${newNoticesCount} new notices, updated ${updatedNoticesCount} notices. ${remainingBacklog} more queued for the next run.`
        : `Sync complete. Imported ${newNoticesCount} new notices, updated ${updatedNoticesCount} notices.`,
      imported: importedTitles,
      updated: updatedTitles,
      remainingBacklog,
      ...(Object.keys(listingErrors).length > 0 ? { listingErrors } : {})
    });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ success: false, error: error.message || 'Cron Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
