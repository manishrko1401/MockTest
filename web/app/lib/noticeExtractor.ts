// Utility for extracting clean, structured content & useful links from RojgarResult / SarkariResult HTML

export function extractUsefulLinksBlock(html: string): string | null {
  if (!html) return null;
  const lower = html.toLowerCase();
  let linksIdx = lower.indexOf('useful important link');
  if (linksIdx === -1) linksIdx = lower.indexOf('important link');
  if (linksIdx === -1) linksIdx = lower.indexOf('useful link');
  if (linksIdx === -1) return null;

  // Find start: look backwards for <table or <tr
  let blockStart = html.lastIndexOf('<table', linksIdx);
  const rowStart = html.lastIndexOf('<tr', linksIdx);
  if (blockStart === -1 || (rowStart !== -1 && linksIdx - rowStart < linksIdx - blockStart && linksIdx - rowStart < 400)) {
    blockStart = rowStart !== -1 ? rowStart : linksIdx;
  }

  // Find end: search for the next closing </table> after linksIdx
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

export function extractDirectLink(html: string, defaultUrl: string, category: string): string {
  // Extract all rows from table
  const trMatches = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const rows: { text: string; href: string }[] = [];

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

  const isValidDirectLink = (href: string) => {
    if (href.includes('youtu.be') || href.includes('youtube.com')) return false;
    // Disallow pure category listing / tag index urls
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

export function extractLastDate(html: string): string | null {
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

export function extractNoticeContent(pageHtml: string): string | null {
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

    // Skip pure floating social media tables (NOT the Useful Important Links table)
    const isPureSocialMediaTable = !isUsefulLinks && !isImportantDates && !isApplicationFee && !isAgeLimit && !isVacancyDetails && !isCategoryVacancy &&
      (lower.includes('face book') || lower.includes('telegram') || lower.includes('whatsapp') || lower.includes('instagram') || lower.includes('android app') || lower.includes('twitter'));
    if (isPureSocialMediaTable) continue;

    const isSelectionProcedureOnly = !isUsefulLinks && (lower.includes('selection procedure') || lower.includes('selection process') || lower.includes('selection mode')) && !isVacancyDetails && !isImportantDates;
    const isHowToApplyOnly = !isUsefulLinks && (lower.includes('how to apply') || lower.includes('how to fill') || lower.includes('step to apply'));
    const isFaqOnly = !isUsefulLinks && (lower.includes('frequently asked questions') || lower.includes('important faqs') || lower.includes('faq:'));
    if (isSelectionProcedureOnly || isHowToApplyOnly || isFaqOnly) continue;

    if (isUsefulLinks || isImportantDates || isApplicationFee || isAgeLimit || isVacancyDetails || isCategoryVacancy) {
      let cleanTable = fullTable.replace(/\s*width=["']?\d+(?:px|%)?["']?/gi, '');
      
      // In Useful Important Links table, KEEP video rows, channel rows, and PDF notices
      if (!isUsefulLinks) {
        cleanTable = cleanTable.replace(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?(?:Watch\s*Video|Hindi\s*Video|Join\s*Free|Information\s*Channel|Official\s*Whatsapp|Whats-App|WhatsApp|Telegram|Instagram|Face\s*Book|You\s*Tube|Reels)(?:(?!<\/tr>)[\s\S])*?<\/tr>/gi, '');
      }
      
      // Strip purely branding rows (ONLY if the row has no actionable link)
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

      // Strip branding inside text nodes
      cleanTable = cleanTable.replace(/>([^<]*)(?:Sarkari\s*Result®?|sarkariresult\.com|Rojgar\s*Result®?|\.Com)([^<]*)</gi, '>$1$2<');
      cleanTable = cleanTable.replace(/<tr[^>]*>\s*(?:<td[^>]*>\s*(?:<[^>]*>\s*)*<\/td>\s*)*<\/tr>/gi, '');
      cleanTable = cleanTable.replace(/<a\s+(?!.*?target=)/gi, '<a target="_blank" rel="noopener noreferrer" ');

      const tableBody = cleanTable.replace(/^<table[^>]*>/i, '').replace(/<\/table>$/i, '');
      allowedBlocks.push(`<div class="notice-table-wrapper overflow-x-auto max-w-full my-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900"><table class="w-full text-left">${tableBody}</table></div>`);
    }
  }

  // D. CRITICAL RESCUE: Check if Useful Important Links was captured
  // If missed due to malformed/unclosed nested tables, extract directly with fallback
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
