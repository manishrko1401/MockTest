import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { uploadNoticeHtmlToTigris } from '../../../lib/tigrisNoticeStorage';
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

// Shared HTML cleanup logic for extracted notice content
function cleanExtracted(extracted: string): string {
  let s = extracted;
  // Remove header and h1 tags if present
  s = s.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
  s = s.replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, '');
  s = s.replace(/<p[^>]*>(?:(?!<\/p>)[\s\S]){1,300}?Post\s*(?:Update\s*)?Date(?:(?!<\/p>)[\s\S]){1,300}?<\/p>/gi, '');

  // Remove Short Description sections safely (li, p, h2-h4, tr, b/strong)
  s = s.replace(/<li[^>]*>(?:(?!<\/li>)[\s\S])*?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/li>)[\s\S])*?<\/li>/gi, '');
  s = s.replace(/<p[^>]*>(?:(?!<\/p>)[\s\S]){1,400}?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/p>)[\s\S]){1,400}?<\/p>/gi, '');
  s = s.replace(/<h[2-4][^>]*>(?:(?!<\/h[2-4]>)[\s\S])*?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/h[2-4]>)[\s\S])*?<\/h[2-4]>/gi, '');
  s = s.replace(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/tr>)[\s\S])*?<\/tr>/gi, '');
  s = s.replace(/(?:<b>|<strong>)?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)\s*:?\s*(?:<\/b>|<\/strong>)?(?:[^<\n\r]{0,250})/gi, '');

  // Clean ads & scripts
  s = s.replace(/<ins[^>]*class=["']adsbygoogle["'][\s\S]*?<\/ins>/gi, '');
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '');

  // Remove People Also Viewed widget
  s = s.replace(/<div[^>]*class=["']rr-people-viewed["'][\s\S]*?<\/div>/gi, '');

  // Remove Social link tables safely using negative lookahead (?!<\/table>) so other tables are never touched
  s = s.replace(/<table[^>]*>(?:(?!<\/table>)[\s\S])*?(?:Mobile\s*Android\s*App|Twitter\s*\(X\)|Face\s*Book|Telegram\s*Channel|WhatsApp\s*Channel|Instagram\s*Reels)(?:(?!<\/table>)[\s\S])*?<\/table>/gi, '');

  // Ensure all <a> links open in new tab
  s = s.replace(/<a\s+(?!.*?target=)/gi, '<a target="_blank" rel="noopener noreferrer" ');
  return s.trim();
}

// Extract ONLY specified target sections (Heading, Overview, Important Dates, Application Fees, Age Limit, Vacancy Details, Category Wise Vacancy Details, Useful Important Links)
function extractNoticeContent(pageHtml: string): string | null {
  if (!pageHtml) return null;

  // 1. Find <article> block or entry-content
  const articleStart = pageHtml.indexOf('<article');
  let bodyHtml = pageHtml;

  if (articleStart !== -1) {
    let articleEnd = pageHtml.indexOf('</article>', articleStart);
    if (articleEnd === -1) articleEnd = articleStart + 60000;
    else articleEnd += 10;
    bodyHtml = pageHtml.substring(articleStart, articleEnd);

    // Detect homepage redirect: many gb-loop-items = not an individual post page
    const loopItemCount = (bodyHtml.match(/gb-loop-item/g) || []).length;
    if (loopItemCount > 5) return null;
  }

  const entryContentIdx = bodyHtml.indexOf('class="entry-content"');
  if (entryContentIdx !== -1) {
    const divStart = bodyHtml.lastIndexOf('<div', entryContentIdx);
    if (divStart !== -1) bodyHtml = bodyHtml.substring(divStart);
  }

  const allowedBlocks: string[] = [];

  // A. HEADING (Notice main title heading)
  const headingMatch = /<h[12][^>]*>([\s\S]*?)<\/h[12]>/i.exec(bodyHtml);
  if (headingMatch) {
    let hText = headingMatch[1].replace(/<[^>]*>/g, '').trim();
    hText = hText.replace(/&amp;/g, '&').replace(/&#038;/g, '&').replace(/&#8211;/g, '-');
    if (hText && !/Rojgar\s*Result/i.test(hText) && hText.length > 10) {
      allowedBlocks.push(`<h2 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white my-3">${hText}</h2>`);
    }
  }

  // B. OVERVIEW SECTION (Summary paragraph describing post)
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

  // C. TABLES / SECTIONS ONLY:
  // - Important Dates
  // - Application Fees
  // - Age Limit
  // - Vacancy Details
  // - Category Wise Vacancy Details
  // - Some Useful Important Links
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tMatch: RegExpExecArray | null;

  while ((tMatch = tableRegex.exec(bodyHtml)) !== null) {
    const fullTable = tMatch[0];
    const tableContent = tMatch[1];
    const lower = tableContent.toLowerCase();

    // Whitelist criteria:
    const isUsefulLinks = lower.includes('useful important link') || lower.includes('important link') || lower.includes('direct link') || lower.includes('apply online') || lower.includes('download notification') || lower.includes('official website');
    const isImportantDates = lower.includes('important date') || lower.includes('application begin') || lower.includes('last date for apply');
    const isApplicationFee = lower.includes('application fee') || lower.includes('exam fee') || lower.includes('general / obc');
    const isAgeLimit = lower.includes('age limit') || lower.includes('minimum age') || lower.includes('maximum age');
    const isVacancyDetails = lower.includes('vacancy detail') || lower.includes('total post') || lower.includes('eligibility');
    const isCategoryVacancy = lower.includes('category wise') || lower.includes('category-wise') || (lower.includes('post name') && (lower.includes('ur') || lower.includes('obc') || lower.includes('sc') || lower.includes('st')));

    // Only skip standalone pure social media tables (NEVER skip Useful Links tables)
    const isPureSocialMediaTable = !isUsefulLinks && !isImportantDates && !isApplicationFee && !isAgeLimit && !isVacancyDetails && !isCategoryVacancy &&
      (lower.includes('face book') || lower.includes('telegram') || lower.includes('whatsapp') || lower.includes('instagram') || lower.includes('android app') || lower.includes('twitter'));

    if (isPureSocialMediaTable) continue;

    // Blacklist non-requested standalone tables (Selection Procedure only, How to Apply only, FAQs)
    const isSelectionProcedureOnly = (lower.includes('selection procedure') || lower.includes('selection process') || lower.includes('selection mode')) && !isVacancyDetails && !isImportantDates;
    const isHowToApplyOnly = lower.includes('how to apply') || lower.includes('how to fill') || lower.includes('step to apply');
    const isFaqOnly = lower.includes('faq') || lower.includes('question') || lower.includes('answer');

    if (isSelectionProcedureOnly || isHowToApplyOnly || isFaqOnly) continue;

    if (isUsefulLinks || isImportantDates || isApplicationFee || isAgeLimit || isVacancyDetails || isCategoryVacancy) {
      let cleanTable = fullTable.replace(/\s*width=["']?\d+(?:px|%)?["']?/gi, '');
      
      // Strip social media & promo rows inside tables (e.g. WhatsApp/Telegram rows inside Useful Links table)
      cleanTable = cleanTable.replace(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?(?:Watch\s*Video|Hindi\s*Video|Short\s*Notification\s*\(?[\w\s]*Video|Join\s*Free\s*Information|Information\s*Channel|Official\s*Whatsapp|Whats-App|WhatsApp|Telegram|Instagram|Face\s*Book|You\s*Tube|Reels)(?:(?!<\/tr>)[\s\S])*?<\/tr>/gi, '');
      
      // Remove purely branding <a> tags where anchor text is "Rojgar Result" or "rojgarresult.com"
      cleanTable = cleanTable.replace(/<a[^>]*>\s*(?:Rojgar\s*Result®?|rojgarresult\.com|\.Com)\s*<\/a>/gi, '');

      // Remove branding text strictly inside text nodes (between > and <) without corrupting href URLs
      cleanTable = cleanTable.replace(/>([^<]*)(?:Rojgar\s*Result®?|rojgarresult\.com)([^<]*)</gi, '>$1$2<');

      // Ensure all <a> tags open in new tab
      cleanTable = cleanTable.replace(/<a\s+(?!.*?target=)/gi, '<a target="_blank" rel="noopener noreferrer" ');

      const tableBody = cleanTable.replace(/^<table[^>]*>/i, '').replace(/<\/table>$/i, '');
      allowedBlocks.push(`<div class="notice-table-wrapper overflow-x-auto max-w-full my-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900"><table class="w-full text-left">${tableBody}</table></div>`);
    }
  }

  if (allowedBlocks.length === 0) return null;
  return allowedBlocks.join('\n\n');
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
        
        if (h2Match) {
          // Extract href from WITHIN the h2 tag (the actual post URL, not thumbnail)
          const h2Content = h2Match[1];
          const hrefInH2 = /href="([^"]+)"/i.exec(h2Content);
          const hrefAnywhere = /href="([^"]+)"/i.exec(part);
          const urlCandidate = hrefInH2 ? hrefInH2[1].trim() : (hrefAnywhere ? hrefAnywhere[1].trim() : null);
          
          if (urlCandidate && urlCandidate.includes('rojgarresult.com')) {
            const title = h2Content
              .replace(/<[^>]*>/g, '')
              .replace(/&amp;/g, '&')
              .replace(/&#038;/g, '&')
              .replace(/&#8211;/g, '-')
              .replace(/\s+/g, ' ')
              .trim();
            parsedItems.push({ title, url: urlCandidate });
          }
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
          if (existing.title !== item.title || !(existing as any).contentHtml) {
            console.log(`Cron: Found UPDATED/UNFETCHED ${target.name}: "${existing.title}" -> "${item.title}"`);
            let dateObj = new Date();
            let directUrl = item.url;
            let lastDate = existing.lastDate;
            let contentHtml: string | null = null;

            try {
              const pageHtml = await fetchUrl(item.url);
              directUrl = extractDirectLink(pageHtml, item.url, target.category);
              contentHtml = extractNoticeContent(pageHtml);

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

            let contentLink: string | null = null;
            if (contentHtml) {
              try {
                contentLink = await uploadNoticeHtmlToTigris(id, contentHtml);
              } catch (e: any) {
                console.error(`Failed to upload updated notice ${id} HTML to Tigris:`, e.message);
                contentLink = contentHtml;
              }
            }

            await prisma.notice.update({
              where: { id },
              data: {
                title: item.title,
                date: dateStr,
                publishDate: publishDateStr,
                url: directUrl,
                rawUrl: item.url,
                lastDate,
                contentHtml: contentLink,
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
        let contentHtml: string | null = null;

        try {
          const pageHtml = await fetchUrl(item.url);
          directUrl = extractDirectLink(pageHtml, item.url, target.category);
          contentHtml = extractNoticeContent(pageHtml);

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

        let contentLink: string | null = null;
        if (contentHtml) {
          try {
            contentLink = await uploadNoticeHtmlToTigris(id, contentHtml);
          } catch (e: any) {
            console.error(`Failed to upload notice ${id} HTML to Tigris:`, e.message);
            contentLink = contentHtml;
          }
        }

        await prisma.notice.create({
          data: {
            id,
            title: item.title,
            date: dateStr,
            publishDate: publishDateStr,
            type: target.type,
            category: target.category,
            url: directUrl,
            rawUrl: item.url,
            lastDate,
            contentHtml: contentLink,
            createdAt: createdAtTimestamp
          }
        });

        newNoticesCount++;
        importedTitles.push(item.title);
        importedIndex++;
      }
    }

    if (newNoticesCount > 0 || updatedNoticesCount > 0) {
      if ((global as any).catalogCache) {
        (global as any).catalogCache.noticesList = null;
        (global as any).catalogCache.noticesLastFetched = null;
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
