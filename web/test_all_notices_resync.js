require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL;
const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function cleanExtracted(s) {
  if (!s) return '';
  s = s.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
  s = s.replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, '');
  s = s.replace(/<p[^>]*>(?:(?!<\/p>)[\s\S]){1,300}?Post\s*(?:Update\s*)?Date(?:(?!<\/p>)[\s\S]){1,300}?<\/p>/gi, '');
  s = s.replace(/<li[^>]*>(?:(?!<\/li>)[\s\S])*?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/li>)[\s\S])*?<\/li>/gi, '');
  s = s.replace(/<p[^>]*>(?:(?!<\/p>)[\s\S]){1,400}?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/p>)[\s\S]){1,400}?<\/p>/gi, '');
  s = s.replace(/<h[2-4][^>]*>(?:(?!<\/h[2-4]>)[\s\S])*?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/h[2-4]>)[\s\S])*?<\/h[2-4]>/gi, '');
  s = s.replace(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/tr>)[\s\S])*?<\/tr>/gi, '');
  s = s.replace(/(?:<b>|strong)?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)\s*:?\s*(?:<\/b>|<\/strong>)?(?:[^<\n\r]{0,250})/gi, '');
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

async function testNotices() {
  const notices = await prisma.notice.findMany({
    where: { rawUrl: { not: null } },
    take: 30,
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, rawUrl: true, url: true }
  });

  console.log(`Testing extraction for ${notices.length} notices...\n`);

  let successCount = 0;
  let failCount = 0;

  for (const notice of notices) {
    const fetchUrlStr = notice.rawUrl || notice.url;
    try {
      const res = await fetch(fetchUrlStr, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      const pageHtml = await res.text();
      const extracted = extractNoticeContent(pageHtml);

      if (extracted && extracted.length > 500) {
        const tableCount = (extracted.match(/<table/gi) || []).length;
        console.log(`✅ [${notice.id}] "${notice.title.substring(0, 40)}..." -> ${extracted.length} bytes, ${tableCount} tables`);
        successCount++;
      } else {
        console.log(`❌ [${notice.id}] "${notice.title.substring(0, 40)}..." -> EXTRACTION FAILED (len: ${extracted ? extracted.length : 0})`);
        failCount++;
      }
    } catch (err) {
      console.log(`❌ [${notice.id}] Error fetching ${fetchUrlStr}: ${err.message}`);
      failCount++;
    }
  }

  console.log(`\nSummary: ${successCount} successful, ${failCount} failed.`);
  await prisma.$disconnect();
}

testNotices();
