require('dotenv').config({ path: '.env' });
const fs = require('fs');

function processQuestionHtml(html) {
  if (!html) return '';
  let clean = html;
  clean = clean.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  return clean;
}

function sanitizeNoticeHtml(html) {
  if (!html) return '';
  let clean = html;

  clean = processQuestionHtml(clean);

  // 1. Remove <header class="entry-header">...</header>
  clean = clean.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');

  // 2. Remove all top <h1>...</h1> tags
  clean = clean.replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, '');

  // 3. Remove individual <h2> tags whose OWN text contains title keywords
  clean = clean.replace(/<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?(?:Application\s*Form|Online\s*Form|Recruitment\s*20\d\d)(?:(?!<\/h2>)[\s\S])*?<\/h2>/gi, (match) => {
    if (/(?:overview|how\s*to|step|instruction|guide|process)/i.test(match)) return match;
    return '';
  });

  // 4. Remove Post Update Date / Post Date paragraphs ONLY within single paragraph boundary (max 300 chars)
  clean = clean.replace(/<p[^>]*>(?:(?!<\/p>)[\s\S]){1,300}?Post\s*(?:Update\s*)?Date(?:(?!<\/p>)[\s\S]){1,300}?<\/p>/gi, '');

  // 5. Remove all Short Description / Short Details / Short Information sections (li, p, h2-h4, tr, text)
  clean = clean.replace(/<li[^>]*>(?:(?!<\/li>)[\s\S])*?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/li>)[\s\S])*?<\/li>/gi, '');
  clean = clean.replace(/<p[^>]*>(?:(?!<\/p>)[\s\S]){1,400}?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/p>)[\s\S]){1,400}?<\/p>/gi, '');
  clean = clean.replace(/<h[2-4][^>]*>(?:(?!<\/h[2-4]>)[\s\S])*?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/h[2-4]>)[\s\S])*?<\/h[2-4]>/gi, '');
  clean = clean.replace(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/tr>)[\s\S])*?<\/tr>/gi, '');
  clean = clean.replace(/(?:<b>|<strong>)?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)\s*:?\s*(?:<\/b>|<\/strong>)?(?:[^<\n\r]{0,250})/gi, '');

  // 6. Remove video and social media promotion rows in ANY table
  clean = clean.replace(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?(?:Watch\s*Video|Hindi\s*Video|Short\s*Notification\s*\(?[\w\s]*Video|Join\s*Free\s*Information|Information\s*Channel|Official\s*Whatsapp|Official\s*Telegram)(?:(?!<\/tr>)[\s\S])*?<\/tr>/gi, '');

  // 7. Clean fixed inline width attributes from tables, th, td
  clean = clean.replace(/\s*width=["']?\d+(?:px|%)?["']?/gi, '');

  // 8. Wrap all table elements
  clean = clean.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match) => {
    const tableBody = match.replace(/^<table[^>]*>/i, '').replace(/<\/table>$/i, '');
    return `<div class="notice-table-wrapper overflow-x-auto max-w-full my-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900"><table class="w-full text-left">${tableBody}</table></div>`;
  });

  // 9. Remove any leftover empty paragraphs
  clean = clean.replace(/^(?:\s*<p>\s*(?:&nbsp;|\s*)*<\/p>)*/gi, '');

  return clean.trim();
}

function cleanExtracted(s) {
  if (!s) return '';
  s = s.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
  s = s.replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, '');
  s = s.replace(/<p[^>]*>(?:(?!<\/p>)[\s\S]){1,300}?Post\s*(?:Update\s*)?Date(?:(?!<\/p>)[\s\S]){1,300}?<\/p>/gi, '');
  s = s.replace(/<li[^>]*>(?:(?!<\/li>)[\s\S])*?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/li>)[\s\S])*?<\/li>/gi, '');
  s = s.replace(/<p[^>]*>(?:(?!<\/p>)[\s\S]){1,400}?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/p>)[\s\S]){1,400}?<\/p>/gi, '');
  s = s.replace(/<h[2-4][^>]*>(?:(?!<\/h[2-4]>)[\s\S])*?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/h[2-4]>)[\s\S])*?<\/h[2-4]>/gi, '');
  s = s.replace(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/tr>)[\s\S])*?<\/tr>/gi, '');
  s = s.replace(/(?:<b>|<strong>)?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)\s*:?\s*(?:<\/b>|<\/strong>)?(?:[^<\n\r]{0,250})/gi, '');
  s = s.replace(/<ins[^>]*class=["']adsbygoogle["'][\s\S]*?<\/ins>/gi, '');
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<div[^>]*class=["']rr-people-viewed["'][\s\S]*?<\/div>/gi, '');
  // FIXED REGEX using negative lookahead (?!<\/table>) to prevent wiping all tables!
  s = s.replace(/<table[^>]*>(?:(?!<\/table>)[\s\S])*?(?:Mobile\s*Android\s*App|Twitter\s*\(X\)|Face\s*Book|Telegram\s*Channel|WhatsApp\s*Channel|Instagram\s*Reels)(?:(?!<\/table>)[\s\S])*?<\/table>/gi, '');
  s = s.replace(/<a\s+(?!.*?target=)/gi, '<a target="_blank" rel="noopener noreferrer" ');
  return s.trim();
}

function extractNoticeContent(pageHtml) {
  if (!pageHtml) return null;

  const articleStart = pageHtml.indexOf('<article');
  if (articleStart !== -1) {
    let articleEnd = pageHtml.indexOf('</article>', articleStart);
    if (articleEnd === -1) articleEnd = articleStart + 50000;
    else articleEnd += 10;

    const articleHtml = pageHtml.substring(articleStart, articleEnd);

    const loopItemCount = (articleHtml.match(/gb-loop-item/g) || []).length;
    if (loopItemCount > 5) return null;

    const entryContentIdx = articleHtml.indexOf('class="entry-content"');
    let extracted = articleHtml;
    if (entryContentIdx !== -1) {
      const divStart = articleHtml.lastIndexOf('<div', entryContentIdx);
      if (divStart !== -1) extracted = articleHtml.substring(divStart);
    }

    if (extracted.length < 300) return null;
    return cleanExtracted(extracted);
  }
  return null;
}

async function testFetchAndExtract() {
  const url = 'https://rojgarresult.com/sbi-junior-associates-clerk-jca-2026/';
  console.log('Fetching:', url);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  const pageHtml = await res.text();
  console.log('Fetched HTML length:', pageHtml.length);

  const extracted = extractNoticeContent(pageHtml);
  console.log('Extracted content length:', extracted ? extracted.length : 0);

  if (extracted) {
    const tableCount = (extracted.match(/<table/gi) || []).length;
    console.log('Extracted table count:', tableCount);
    console.log('Has Important Dates:', /Important Date/i.test(extracted));
    console.log('Has Vacancy Details:', /Vacancy/i.test(extracted));
    console.log('Has Links:', /Important Link/i.test(extracted));

    const sanitized = sanitizeNoticeHtml(extracted);
    console.log('\nSanitized length:', sanitized.length);
    console.log('Sanitized table count:', (sanitized.match(/<table/gi) || []).length);
    console.log('Sanitized snippet (first 300 chars):', sanitized.substring(0, 300));
  }
}

testFetchAndExtract().catch(console.error);
