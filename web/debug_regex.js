const fs = require('fs');
const raw = fs.readFileSync('icf_test_raw.html', 'utf8');

const regexes = [
  { name: 'ads', re: /<ins[^>]*class=["']adsbygoogle["'][\s\S]*?<\/ins>/gi },
  { name: 'script', re: /<script[\s\S]*?<\/script>/gi },
  { name: 'people-viewed', re: /<div[^>]*class=["']rr-people-viewed["'][\s\S]*?<\/div>/gi },
  { name: 'social-tables', re: /<table[^>]*>[\s\S]*?(?:Face\s*Book|Telegram\s*Channel|WhatsApp\s*Channel|Instagram\s*Reels)[\s\S]*?<\/table>/gi },
  { name: 'social-rows', re: /<tr[^>]*>[\s\S]*?(?:Join\s*Free\s*Information|Free\s*Information\s*Channel|Watch\s*Video|Reels)[\s\S]*?<\/tr>/gi },
  { name: 'youtube-rows', re: /<tr[^>]*>[\s\S]*?(?:youtu\.?be|instagram\.com\/reels)[\s\S]*?<\/tr>/gi },
  { name: 'rojgar-rows', re: /<tr[^>]*>\s*<td[^>]*>[\s\S]*?Rojgar\s*Result[\s\S]*?<\/td>[\s\S]*?<\/tr>/gi },
  { name: 'rojgar-text', re: /Rojgar\s*Result®?\s*/gi },
  { name: 'rojgar-domain', re: /rojgarresult\.com/gi },
  { name: 'rojgar-links', re: /<a[^>]*href=["'][^"']*rojgarresult\.com[^"']*["'][^>]*>[\s\S]*?<\/a>/gi },
  { name: 'rojgar-word', re: /rojgarresult/gi },
];

let current = raw;
for (const r of regexes) {
  const before = current.length;
  current = current.replace(r.re, '');
  const diff = before - current.length;
  console.log(`Regex [${r.name}] removed ${diff} characters. Remaining: ${current.length}`);
}
