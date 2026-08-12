require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const dbUrl = process.env.DATABASE_URL;
const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const s3 = new S3Client({
  endpoint: process.env.TIGRIS_ENDPOINT || 'https://fly.storage.tigris.dev',
  region: 'auto',
  credentials: {
    accessKeyId: process.env.TIGRIS_ACCESS_KEY_ID,
    secretAccessKey: process.env.TIGRIS_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

async function getFromTigris(key) {
  try {
    let cleanKey = key.replace('tigris://', '');
    const resp = await s3.send(new GetObjectCommand({ Bucket: process.env.TIGRIS_BUCKET_NAME || 'mocktest-assets', Key: cleanKey }));
    const chunks = [];
    for await (const chunk of resp.Body) chunks.push(chunk);
    return Buffer.concat(chunks).toString('utf-8');
  } catch (e) {
    console.error(`Error for key ${key}:`, e.message);
    return null;
  }
}

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

  // 5. Remove all Short Description / Short Details / Short Information sections (li, p, h2-h4, div, tr, text)
  clean = clean.replace(/<li[^>]*>(?:(?!<\/li>)[\s\S])*?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/li>)[\s\S])*?<\/li>/gi, '');
  clean = clean.replace(/<p[^>]*>(?:(?!<\/p>)[\s\S]){1,400}?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/p>)[\s\S]){1,400}?<\/p>/gi, '');
  clean = clean.replace(/<h[2-4][^>]*>(?:(?!<\/h[2-4]>)[\s\S])*?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/h[2-4]>)[\s\S])*?<\/h[2-4]>/gi, '');
  clean = clean.replace(/<div[^>]*>(?:(?!<\/div>)[\s\S]){1,400}?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/div>)[\s\S]){1,400}?<\/div>/gi, '');
  clean = clean.replace(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/tr>)[\s\S])*?<\/tr>/gi, '');
  clean = clean.replace(/(?:<b>|strong)?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)\s*:?\s*(?:<\/b>|<\/strong>)?(?:[^<\n\r]{0,250})/gi, '');

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

async function testNotices() {
  const notices = await prisma.notice.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, contentHtml: true, url: true }
  });

  console.log(`Analyzing ${notices.length} most recent notices...\n`);

  for (const n of notices) {
    console.log(`--- [ID: ${n.id}] ${n.title} ---`);
    let rawHtml = n.contentHtml;
    if (!rawHtml) {
      console.log(`❌ contentHtml is NULL`);
      continue;
    }

    if (rawHtml.startsWith('tigris://')) {
      const key = rawHtml.replace('tigris://', '');
      rawHtml = await getFromTigris(key);
      if (!rawHtml) {
        console.log(`❌ Failed to fetch from Tigris key: ${key}`);
        continue;
      }
    }

    console.log(`Raw HTML length: ${rawHtml.length} bytes`);
    const sanitized = sanitizeNoticeHtml(rawHtml);
    console.log(`Sanitized length: ${sanitized.length} bytes`);
    
    // Check key elements
    const hasTable = sanitized.includes('<table');
    const hasImportantDates = /important date|last date/i.test(sanitized);
    const hasVacancy = /vacancy|post|eligibility|age limit/i.test(sanitized);
    const hasLinks = /important link|apply online|download/i.test(sanitized);

    console.log(`Analysis -> Table: ${hasTable} | Dates: ${hasImportantDates} | Vacancy: ${hasVacancy} | Links: ${hasLinks}`);
    if (sanitized.length < 100) {
      console.log(`⚠️ SHORT SANITIZED CONTENT: "${sanitized}"`);
      console.log(`Raw HTML snippet: ${rawHtml.substring(0, 300)}`);
    } else {
      console.log(`Snippet: ${sanitized.substring(0, 150).replace(/\n/g, ' ')}...`);
    }
    console.log('\n');
  }

  await prisma.$disconnect();
}

testNotices();
