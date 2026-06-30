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
    // Basic auth check to prevent random triggers (optional)
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.log("Cron Sync started...");
    const feedXml = await fetchUrl('https://rojgarresult.com/feed/');
    
    // Extract all <item> tags
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    const feedItems: { title: string; link: string; pubDate: string; categories: string }[] = [];
    
    while ((match = itemRegex.exec(feedXml)) !== null) {
      const itemXml = match[1];
      
      const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(itemXml);
      const linkMatch = /<link>([\s\S]*?)<\/link>/.exec(itemXml);
      const dateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(itemXml);
      
      const catRegex = /<category>[\s\S]*?<!\[CDATA\[([\s\S]*?)\]\]>[\s\S]*?<\/category>/gi;
      let catMatch;
      const itemCats: string[] = [];
      while ((catMatch = catRegex.exec(itemXml)) !== null) {
        itemCats.push(catMatch[1]);
      }
      
      if (linkMatch) {
        const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim() : '';
        const link = linkMatch[1].replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim();
        const pubDate = dateMatch ? dateMatch[1].replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim() : '';
        feedItems.push({ title, link, pubDate, categories: itemCats.join(', ') });
      }
    }
    
    let newNoticesCount = 0;
    const importedTitles: string[] = [];
    
    // Process items in reverse (oldest first) so order is preserved
    for (let i = feedItems.length - 1; i >= 0; i--) {
      const item = feedItems[i];
      const { category, type, prefix } = mapCategoryAndType(item.categories, item.link, item.title);
      
      const hash = crypto.createHash('md5').update(item.link).digest('hex').substring(0, 10);
      const id = `${prefix}${hash}`;
      
      // Check duplicate
      const existing = await prisma.notice.findUnique({
        where: { id }
      });
      
      if (existing) continue;
      
      // Fetch detail page
      let dateObj = item.pubDate ? new Date(item.pubDate) : new Date();
      let directUrl = item.link;
      let lastDate: string | null = null;
      
      try {
        const pageHtml = await fetchUrl(item.link);
        directUrl = extractDirectLink(pageHtml, item.link, category);
        
        if (category === 'notice') {
          const lastDateMatch = /Last Date:\s*([0-9\/]+)/i.exec(pageHtml);
          if (lastDateMatch) lastDate = lastDateMatch[1].trim();
        }
        
        const schemaMatch = /"datePublished"\s*:\s*"([^"]*)"/i.exec(pageHtml);
        if (schemaMatch) {
          dateObj = new Date(schemaMatch[1]);
        }
      } catch (err) {
        console.error(`Cron Warning: Failed to fetch detail page for ${item.link}`);
      }
      
      const dateStr = formatPublishDate(dateObj);
      const publishDateStr = dateObj.toISOString().split('T')[0];
      const createdAtTimestamp = new Date(dateObj.getTime() - (i * 1000));
      
      await prisma.notice.create({
        data: {
          id,
          title: item.title,
          date: dateStr,
          publishDate: publishDateStr,
          type,
          category,
          url: directUrl,
          lastDate,
          createdAt: createdAtTimestamp
        }
      });
      
      newNoticesCount++;
      importedTitles.push(item.title);
    }
    
    return NextResponse.json({
      success: true,
      message: `Sync complete. Imported ${newNoticesCount} new notices.`,
      imported: importedTitles
    });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ success: false, error: error.message || 'Cron Server error' }, { status: 500 });
  }
}
