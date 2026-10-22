import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { requireCronOrAdmin } from '../../../lib/serverAuth';
import { invalidateShared, NOTICES_TAG } from '../../../lib/sharedCache';
import { uploadNoticeHtmlToTigris } from '../../../lib/tigrisNoticeStorage';
import { extractDirectLink, extractLastDate, extractNoticeContent } from '../../../lib/noticeExtractor';
import crypto from 'crypto';

// Vercel Hobby plan allows up to 60s per function invocation.
export const maxDuration = 60;

// Format date to: 30 June 2026
function formatPublishDate(date: Date): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
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
  { name: 'Latest Jobs', category: 'notice', type: 'JOB', prefix: 'job_' },
  { name: 'Result', category: 'result', type: 'RESULT', prefix: 'res_' },
  { name: 'Admit Card', category: 'admit_card', type: 'ADMIT CARD', prefix: 'ac_' },
  { name: 'Answer Key', category: 'answer_key', type: 'ANSWER KEY', prefix: 'ak_' }
];

function detectCategoryFromTitle(title: string): TargetCategory {
  const t = title.toLowerCase();
  if (t.includes('result') || t.includes('merit list') || t.includes('marks') || t.includes('score card') || t.includes('selection list')) {
    return { name: 'Result', category: 'result', type: 'RESULT', prefix: 'res_' };
  }
  if (t.includes('admit card') || t.includes('hall ticket') || t.includes('call letter') || t.includes('exam city') || t.includes('exam date') || t.includes('time table')) {
    return { name: 'Admit Card', category: 'admit_card', type: 'ADMIT CARD', prefix: 'ac_' };
  }
  if (t.includes('answer key') || t.includes('omr sheet') || t.includes('answer-key') || t.includes('objection key')) {
    return { name: 'Answer Key', category: 'answer_key', type: 'ANSWER KEY', prefix: 'ak_' };
  }
  return { name: 'Latest Jobs', category: 'notice', type: 'JOB', prefix: 'job_' };
}

// Concurrency runner
async function mapConcurrent<T, R>(items: T[], concurrency: number, fn: (item: T, idx: number) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      try {
        results[i] = await fn(items[i], i);
      } catch (err: any) {
        // Continue worker
      }
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const forceResync = searchParams.get('force') === 'true' || searchParams.get('resync') === 'true';
    // ?dry=1: only report what would be imported / updated (nothing is saved)
    const dryRun = searchParams.get('dry') === '1';
    // Scheduled run (CRON_SECRET) or an admin; ?secret= kept for manual runs
    const secretMatches = !!process.env.CRON_SECRET && secret === process.env.CRON_SECRET;
    if (!secretMatches) {
      const denied = await requireCronOrAdmin(request);
      if (denied) return denied;
    }

    console.log(`Cron Sync started from RojgarResult (forceResync: ${forceResync})...`);
    
    let newNoticesCount = 0;
    let updatedNoticesCount = 0;
    const importedTitles: string[] = [];
    const updatedTitles: string[] = [];
    let importedIndex = 0;

    const runStartedAt = Date.now();
    const DEADLINE_MS = 50_000;
    const timeLeft = () => DEADLINE_MS - (Date.now() - runStartedAt);

    type ScrapedNotice = {
      title: string;
      url: string;
      category: string;
      type: string;
      prefix: string;
    };

    // One entry per page AND stage (the same exam page is listed under Jobs and under Results)
    const parsedItemsMap = new Map<string, ScrapedNotice>();
    const seenPages = new Set<string>();

    /** onlyNewPage: for links whose stage is only guessed from the title (don't add a second, guessed stage) */
    function addNoticeItem(rawHref: string, rawTitle: string, targetCat: TargetCategory, onlyNewPage = false) {
      const cleanHref = rawHref.trim();
      const cleanTitle = rawTitle
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&#038;/g, '&')
        .replace(/&#8211;/g, '-')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (
        cleanHref.includes('rojgarresult.com') &&
        !cleanHref.endsWith('/result/') &&
        !cleanHref.endsWith('/admit-card/') &&
        !cleanHref.endsWith('/answer-key/') &&
        !cleanHref.endsWith('/recruitments/') &&
        !cleanHref.endsWith('/admission/') &&
        !cleanHref.endsWith('/syllabus/') &&
        !cleanHref.includes('/page/') &&
        !cleanHref.includes('/category/') &&
        !cleanHref.includes('/tag/') &&
        cleanHref !== 'https://rojgarresult.com/' &&
        cleanHref !== 'https://rojgarresult.com' &&
        cleanTitle.length > 5
      ) {
        const key = `${targetCat.category}|${cleanHref}`;
        if (onlyNewPage && seenPages.has(cleanHref)) return;
        seenPages.add(cleanHref);
        if (!parsedItemsMap.has(key)) {
          parsedItemsMap.set(key, {
            title: cleanTitle,
            url: cleanHref,
            category: targetCat.category,
            type: targetCat.type,
            prefix: targetCat.prefix
          });
        }
      }
    }

    // 1. RojgarResult's home page: only for its highlight links (read last, see 3). Its
    //    sections can't be told apart reliably (each is on the page twice and their names
    //    also appear in the page's styles), so the stages come from the category pages.
    let homeHtml = '';
    try {
      homeHtml = await fetchUrl('https://rojgarresult.com/');
    } catch (e: any) {
      console.error('Cron: Failed to fetch RojgarResult homepage:', e.message);
    }

    // 2. Fetch live notices directly from RojgarResult Category pages
    const ROJGAR_CATEGORY_URLS: Record<string, string> = {
      'notice': 'https://rojgarresult.com/recruitments/',
      'result': 'https://rojgarresult.com/result/',
      'admit_card': 'https://rojgarresult.com/admit-card/',
      'answer_key': 'https://rojgarresult.com/answer-key/'
    };

    for (const target of CATEGORY_CONFIG) {
      const rojgarUrl = ROJGAR_CATEGORY_URLS[target.category];
      if (rojgarUrl) {
        try {
          const catHtml = await fetchUrl(rojgarUrl);
          const h2Regex = /<h2[^>]*>\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
          let m;
          while ((m = h2Regex.exec(catHtml)) !== null) {
            addNoticeItem(m[1], m[2], target);
          }
        } catch (e: any) {
          console.error(`Cron: Failed to fetch RojgarResult listing for ${target.name}:`, e.message);
        }
      }
    }

    // 3. Other links on the home page (top pulse / marquee / highlights): their stage is only
    //    guessed from the title, so they're added last and only for pages not listed above
    if (homeHtml) {
      const h2Regex = /<h2[^>]*>\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      let m;
      while ((m = h2Regex.exec(homeHtml)) !== null) {
        addNoticeItem(m[1], m[2], detectCategoryFromTitle(m[2]), true);
      }
    }

    console.log(`Cron: Total unique notices parsed from RojgarResult: ${parsedItemsMap.size}`);

    const allScraped = Array.from(parsedItemsMap.values());

    // 4. Match against existing DB records
    const idsByUrl = new Map<string, string>();
    for (const item of allScraped) {
      const hash = crypto.createHash('md5').update(item.url).digest('hex').substring(0, 10);
      idsByUrl.set(item.url, `${item.prefix}${hash}`);
    }

    const existingRecords = await prisma.notice.findMany({
      where: {
        OR: [
          { id: { in: Array.from(idsByUrl.values()) } },
          { rawUrl: { in: allScraped.map(i => i.url) } },
          { url: { in: allScraped.map(i => i.url) } }
        ]
      },
      select: { id: true, title: true, contentHtml: true, lastDate: true, rawUrl: true, url: true, category: true }
    });

    // RojgarResult keeps ONE page per exam and adds each stage to it (form → admit card →
    // answer key → result). We keep one notice per page AND stage (id = stage prefix + page
    // hash), so a page that's already here as a job notice must still bring in its new admit
    // card or result. Matching by page address alone used to swallow every later stage.
    const existingById = new Map(existingRecords.map(r => [r.id, r]));
    const existingByUrl = new Map<string, typeof existingRecords[0]>();
    // By its RojgarResult page; the official link only for old rows that don't have the page
    // (an official link can itself be another RojgarResult page, which mixed two notices up)
    for (const r of existingRecords) {
      if (!r.rawUrl && r.url) existingByUrl.set(`${r.category}|${r.url.toLowerCase()}`, r);
    }
    for (const r of existingRecords) {
      if (r.rawUrl) existingByUrl.set(`${r.category}|${r.rawUrl.toLowerCase()}`, r);
    }

    type WorkItem = {
      id: string;
      title: string;
      url: string;
      category: string;
      type: string;
      isUpdate: boolean;
      /** The stage got a new title (e.g. "Exam Schedule" → "Result"): new news, shown at the top again */
      isNewStage?: boolean;
      existingLastDate?: string | null;
    };

    const newItemsQueue: WorkItem[] = [];
    const updateItemsQueue: WorkItem[] = [];

    for (const item of allScraped) {
      let computedId = idsByUrl.get(item.url)!;
      // A row with this id is only this notice if it's for the same page (older syncs sometimes
      // stored another page under it); otherwise this page gets a longer id of its own.
      const byId = existingById.get(computedId);
      const idIsThisPage = !!byId && (!byId.rawUrl || byId.rawUrl.toLowerCase() === item.url.toLowerCase());
      const existing = (idIsThisPage ? byId : null) || existingByUrl.get(`${item.category}|${item.url.toLowerCase()}`);
      if (!existing && byId && !idIsThisPage) {
        computedId = `${item.prefix}${crypto.createHash('md5').update(item.url).digest('hex').substring(0, 20)}`;
      }

      if (existing) {
        const hasContent = existing.contentHtml && existing.contentHtml.length > 5;
        const titleChanged = existing.title !== item.title;
        if (forceResync || titleChanged || !hasContent) {
          updateItemsQueue.push({
            id: existing.id,
            title: item.title,
            url: item.url,
            category: item.category,
            type: item.type,
            isUpdate: true,
            isNewStage: titleChanged,
            existingLastDate: existing.lastDate
          });
        }
      } else {
        newItemsQueue.push({
          id: computedId,
          title: item.title,
          url: item.url,
          category: item.category,
          type: item.type,
          isUpdate: false
        });
      }
    }

    console.log(`Cron: ${newItemsQueue.length} NEW notice(s) to insert, ${updateItemsQueue.length} notice(s) to update`);

    if (dryRun) {
      return NextResponse.json({
        success: true, dryRun: true,
        new: newItemsQueue.map(w => `${w.category}: ${w.title}`),
        newStages: updateItemsQueue.filter(w => w.isNewStage).map(w => `${w.category}: ${w.title}`),
        refreshOnly: updateItemsQueue.filter(w => !w.isNewStage).length,
      });
    }

    // New notices first, then new stages of known pages, then plain content refreshes
    const combinedWork = [...newItemsQueue, ...updateItemsQueue.filter(w => w.isNewStage), ...updateItemsQueue.filter(w => !w.isNewStage)];

    // Concurrently process items within deadline
    let workIndex = 0;
    while (workIndex < combinedWork.length && timeLeft() > 5000) {
      const batchSize = Math.min(5, combinedWork.length - workIndex);
      const batch = combinedWork.slice(workIndex, workIndex + batchSize);
      workIndex += batchSize;

      await mapConcurrent(batch, 5, async (work) => {
        let dateObj = new Date();
        let directUrl = work.url;
        let lastDate: string | null = work.existingLastDate ?? null;
        let contentHtml: string | null = null;

        try {
          const pageHtml = await fetchUrl(work.url);
          directUrl = extractDirectLink(pageHtml, work.url, work.category);
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
          console.error(`Cron: Detail fetch failed for ${work.url}:`, err.message);
        }

        const dateStr = formatPublishDate(dateObj);
        const publishDateStr = dateObj.toISOString().split('T')[0];
        const createdAtTimestamp = new Date(Date.now() + (importedIndex * 1000));

        let contentLink: string | null = null;
        if (contentHtml) {
          try {
            contentLink = await uploadNoticeHtmlToTigris(work.id, contentHtml);
          } catch (e: any) {
            contentLink = contentHtml;
          }
        }

        try {
          if (work.isUpdate) {
            await prisma.notice.update({
              where: { id: work.id },
              data: {
                title: work.title,
                date: dateStr,
                publishDate: publishDateStr,
                url: directUrl,
                rawUrl: work.url,
                lastDate,
                ...(contentLink ? { contentHtml: contentLink } : {}),
                // a new stage is shown as new (the site lists the newest first)
                ...(work.isNewStage ? { createdAt: createdAtTimestamp } : {}),
              }
            });
            updatedNoticesCount++;
            updatedTitles.push(work.title);
          } else {
            await prisma.notice.upsert({
              where: { id: work.id },
              update: {
                title: work.title,
                date: dateStr,
                publishDate: publishDateStr,
                url: directUrl,
                rawUrl: work.url,
                lastDate,
                ...(contentLink ? { contentHtml: contentLink } : {})
              },
              create: {
                id: work.id,
                title: work.title,
                date: dateStr,
                publishDate: publishDateStr,
                type: work.type,
                category: work.category,
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
          console.error(`Cron: Database error for ${work.id} ("${work.title}"):`, dbErr.message);
        }
        importedIndex++;
      });
    }

    const remainingBacklog = combinedWork.length - workIndex;
    if (remainingBacklog > 0) {
      console.log(`Cron: Deadline reached with ${remainingBacklog} notice(s) still remaining for next run.`);
    }

    if (newNoticesCount > 0 || updatedNoticesCount > 0) {
      invalidateShared(NOTICES_TAG);
      if ((global as any).catalogCache) {
        (global as any).catalogCache.noticesList = null;
        (global as any).catalogCache.noticesLastFetched = null;
      }
    }

    return NextResponse.json({
      success: true,
      message: remainingBacklog > 0
        ? `Sync complete. Imported ${newNoticesCount} new notices, updated ${updatedNoticesCount} notices. ${remainingBacklog} more queued for next run.`
        : `Sync complete. Imported ${newNoticesCount} new notices, updated ${updatedNoticesCount} notices from RojgarResult.`,
      imported: importedTitles,
      updated: updatedTitles,
      remainingBacklog
    });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ success: false, error: error.message || 'Cron Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
