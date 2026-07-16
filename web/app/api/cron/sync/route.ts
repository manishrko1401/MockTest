import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import crypto from 'crypto';

// Format date to: 30 June 2026
function formatPublishDate(date: Date) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Function to extract direct apply/download link from details page HTML
function extractDirectLink(pageHtml: string, defaultUrl: string, category: string): string {
  const idx = pageHtml.toLowerCase().indexOf("important links");
  if (idx === -1) return defaultUrl;
  
  const tableArea = pageHtml.substring(idx, idx + 6000);
  
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  const rows: { text: string; href: string }[] = [];
  
  while ((trMatch = trRegex.exec(tableArea)) !== null) {
    const rowHtml = trMatch[1];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdMatch;
    const cells: string[] = [];
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
  
  let primaryKeywords: string[] = [];
  let secondaryKeywords: string[] = [];
  
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

// Function to extract Last Date from details page HTML
function extractLastDate(html: string): string | null {
  // Pattern 1: Table cell structure
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

// Map RSS feed categories/tags to database notice category and type
function mapCategoryAndType(xmlCategoriesStr: string, url: string, title: string) {
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

// Helper to fetch text with User-Agent
async function fetchUrl(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    next: { revalidate: 0 } // Bypass Next.js cache
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}, status: ${response.status}`);
  }
  return await response.text();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.log("Cron Sync started...");
    
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
    const importedTitles: string[] = [];
    const updatedTitles: string[] = [];
    let importedIndex = 0;

    for (const target of targets) {
      console.log(`Cron: Fetching listing for ${target.name}...`);
      let html = '';
      try {
        html = await fetchUrl(target.url);
      } catch (err: any) {
        console.error(`Cron: Failed to fetch listing for ${target.name}:`, err.message);
        continue;
      }

      const parts = html.split('class="gb-loop-item');
      const parsedItems: { title: string; url: string }[] = [];
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

      console.log(`Cron: Parsed ${parsedItems.length} items from ${target.name}`);
      
      const itemsToCheck = parsedItems.slice(0, 40);
      itemsToCheck.reverse();

      for (const item of itemsToCheck) {
        const hash = crypto.createHash('md5').update(item.url).digest('hex').substring(0, 10);
        const id = `${target.prefix}${hash}`;

        const existing = await prisma.notice.findUnique({
          where: { id }
        });

        if (existing) {
          if (existing.title !== item.title) {
            console.log(`Cron: Found UPDATED ${target.name}: "${existing.title}" -> "${item.title}"`);
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
              console.error(`Cron: Warning: Failed to fetch detail page for updated notice ${item.url}`);
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

            updatedNoticesCount++;
            updatedTitles.push(item.title);
            importedIndex++;
          }
          continue;
        }

        console.log(`Cron: Found NEW ${target.name}: "${item.title}"`);
        let dateObj = new Date();
        let directUrl = item.url;
        let lastDate: string | null = null;

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
          console.error(`Cron: Warning: Failed to fetch detail page for ${item.url}`);
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

        newNoticesCount++;
        importedTitles.push(item.title);
        importedIndex++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sync complete. Imported ${newNoticesCount} new notices, updated ${updatedNoticesCount} notices.`,
      imported: importedTitles,
      updated: updatedTitles
    });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ success: false, error: error.message || 'Cron Server error' }, { status: 500 });
  }
}
