const fs = require('fs');

function sanitizeNoticeContent(pageHtml) {
  let extracted = pageHtml;

  // Remove ads
  extracted = extracted.replace(/<ins[^>]*class=["']adsbygoogle["'][\s\S]*?<\/ins>/gi, '');
  // Remove scripts
  extracted = extracted.replace(/<script[\s\S]*?<\/script>/gi, '');
  // Remove "people viewed" widget
  extracted = extracted.replace(/<div[^>]*class=["']rr-people-viewed["'][\s\S]*?<\/div>/gi, '');
  // Remove social media promotion tables (Facebook, Telegram, WhatsApp, Instagram, YouTube)
  extracted = extracted.replace(/<table[^>]*>[\s\S]*?(?:Face\s*Book|Telegram\s*Channel|WhatsApp\s*Channel|Instagram\s*Reels)[\s\S]*?<\/table>/gi, '');
  // Remove social media promotion rows from Important Links table
  extracted = extracted.replace(/<tr[^>]*>[\s\S]*?(?:Join\s*Free\s*Information|Free\s*Information\s*Channel|Watch\s*Video|Reels)[\s\S]*?<\/tr>/gi, '');
  // Remove YouTube/Instagram links rows
  extracted = extracted.replace(/<tr[^>]*>[\s\S]*?(?:youtu\.?be|instagram\.com\/reels)[\s\S]*?<\/tr>/gi, '');
  
  // --- Remove all rojgarresult branding ---
  // Remove "Rojgar Result® Website" row from overview tables
  extracted = extracted.replace(/<tr[^>]*>\s*<td[^>]*>[\s\S]*?Rojgar\s*Result[\s\S]*?<\/td>[\s\S]*?<\/tr>/gi, '');
  // Remove text references to rojgarresult
  extracted = extracted.replace(/Rojgar\s*Result®?\s*/gi, '');
  extracted = extracted.replace(/rojgarresult\.com/gi, '');
  // Remove links pointing to rojgarresult.com  
  extracted = extracted.replace(/<a[^>]*href=["'][^"']*rojgarresult\.com[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, '');
  // Clean up any remaining "rojgarresult" text
  extracted = extracted.replace(/rojgarresult/gi, '');
  
  // Make external links open in new tab
  extracted = extracted.replace(/<a\s+(?!.*?target=)/gi, '<a target="_blank" rel="noopener noreferrer" ');

  return extracted.trim();
}

const raw = fs.readFileSync('icf_test_raw.html', 'utf8');
const sanitized = sanitizeNoticeContent(raw);
console.log(`Raw length: ${raw.length} | Sanitized length: ${sanitized.length}`);
fs.writeFileSync('icf_test_sanitized.html', sanitized);
console.log('Saved icf_test_sanitized.html');
