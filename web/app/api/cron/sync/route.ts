import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
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
  { name: 'Result', category: 'result', type: 'RESULT', prefix: 'res_' },
  { name: 'Admit Card', category: 'admit_card', type: 'ADMIT CARD', prefix: 'ac_' },
  { name: 'Latest Jobs', category: 'notice', type: 'JOB', prefix: 'job_' },
  { name: 'Answer Key', category: 'answer_key', type: 'ANSWER KEY', prefix: 'ak_' }
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const forceResync = searchParams.get('force') === 'true' || searchParams.get('resync') === 'true';
    const authHeader = request.headers.get('authorization');
    const isAuthorized = !process.env.CRON_SECRET ||
      secret === process.env.CRON_SECRET ||
      authHeader === `Bearer ${process.env.CRON_SECRET}` ||
      request.method === 'POST';

    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`Cron Sync started (forceResync: ${forceResync})...`);
    
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

    const ROJGAR_CATEGORY_URLS: Record<string, string> = {
      'result': 'https://rojgarresult.com/result/',
      'admit_card': 'https://rojgarresult.com/admit-card/',
      'answer_key': 'https://rojgarresult.com/answer-key/',
      'notice': 'https://rojgarresult.com/recruitments/'
    };

    // 1. Fetch live notices directly from RojgarResult as primary source
    for (let idx = 0; idx < CATEGORY_CONFIG.length; idx++) {
      const target = CATEGORY_CONFIG[idx];
      const parsedItems: { title: string; url: string }[] = [];
      const rojgarUrl = ROJGAR_CATEGORY_URLS[target.category];

      if (rojgarUrl) {
        try {
          const catHtml = await fetchUrl(rojgarUrl);
          
          // Pattern A: standard <h2><a href="...">Title</a></h2> in RojgarResult posts
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
              parsedItems.push({ title: rawTitle, url: rawHref });
            }
          }

          // Pattern B: gb-loop-item blocks
          if (parsedItems.length === 0) {
            const parts = catHtml.split('class="gb-loop-item');
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
          }
        } catch (e: any) {
          console.error(`Cron: Failed to fetch RojgarResult listing for ${target.name}:`, e.message);
          listingErrors[target.name] = e.message;
        }
      }

      // Fallback: If RojgarResult listing failed, try SarkariResult homepage as backup
      if (parsedItems.length === 0) {
        try {
          const homeHtml = await fetchUrl('https://www.sarkariresult.com/');
          const quickLists = homeHtml.split('<ul class="sarkari-quick-list">');
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
        } catch (fbErr: any) {
          console.error(`Cron: Fallback SarkariResult also failed for ${target.name}:`, fbErr.message);
        }
      }

      console.log(`Cron: Parsed ${parsedItems.length} items for ${target.name} from RojgarResult`);

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
          const needsLinksHeal = !existing.contentHtml || (!existing.contentHtml.toLowerCase().includes('important link') && !existing.contentHtml.toLowerCase().includes('useful link'));
          if (forceResync || existing.title !== item.title || needsLinksHeal) {
            queue.push({ id, title: item.title, url: item.url, isUpdate: true, existingLastDate: existing.lastDate });
          }
        } else {
          queue.push({ id, title: item.title, url: item.url, isUpdate: false });
        }
      }

      // Process newest daily notifications first (top of page)
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
