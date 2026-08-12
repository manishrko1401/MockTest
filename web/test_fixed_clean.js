const fs = require('fs');
const raw = fs.readFileSync('icf_test_raw.html', 'utf8');

function cleanContent(pageHtml) {
  let extracted = pageHtml;

  // Remove ads
  extracted = extracted.replace(/<ins[^>]*class=["']adsbygoogle["'][\s\S]*?<\/ins>/gi, '');
  // Remove scripts
  extracted = extracted.replace(/<script[\s\S]*?<\/script>/gi, '');
  // Remove "people viewed" widget
  extracted = extracted.replace(/<div[^>]*class=["']rr-people-viewed["'][\s\S]*?<\/div>/gi, '');

  // Remove social media tables (ensure we don't cross multiple <table> tags)
  extracted = extracted.replace(/<table[^>]*>(?:(?!<\/table>)[\s\S])*?(?:Face\s*Book|Telegram\s*Channel|WhatsApp\s*Channel|Instagram\s*Reels)(?:(?!<\/table>)[\s\S])*?<\/table>/gi, '');

  // Remove social media / youtube / instagram rows inside tables
  extracted = extracted.replace(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?(?:Join\s*Free\s*Information|Free\s*Information\s*Channel|Watch\s*Video|Reels|youtu\.?be|instagram\.com\/reels)(?:(?!<\/tr>)[\s\S])*?<\/tr>/gi, '');

  // Remove "Rojgar Result® Website" row from overview tables (without crossing </tr>)
  extracted = extracted.replace(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?Rojgar\s*Result(?:(?!<\/tr>)[\s\S])*?<\/tr>/gi, '');

  // Remove rojgarresult branding text and links safely
  // Remove hyperlinks pointing to rojgarresult.com completely (keeps link text if not rojgar, or removes whole tag)
  extracted = extracted.replace(/<a[^>]*href=["'][^"']*rojgarresult\.com[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi, (match, p1) => {
    // If link text is just "Rojgar Result" or empty, delete whole link; otherwise keep text
    const cleanText = p1.replace(/Rojgar\s*Result®?/gi, '').trim();
    return cleanText ? cleanText : '';
  });

  // Clean any remaining text occurrences of "Rojgar Result" / "rojgarresult.com" / "rojgarresult"
  extracted = extracted.replace(/Rojgar\s*Result®?\s*/gi, '');
  extracted = extracted.replace(/rojgarresult\.com/gi, '');
  extracted = extracted.replace(/rojgarresult/gi, '');

  // Clean up broken hrefs like href="https://.com/..." or href="https://.com"
  extracted = extracted.replace(/href=["']https?:\/\/\.com[^"']*["']/gi, '');

  // Ensure all remaining external links open in new tab safely
  extracted = extracted.replace(/<a\s+(?!.*?target=)/gi, '<a target="_blank" rel="noopener noreferrer" ');

  return extracted.trim();
}

const cleaned = cleanContent(raw);
console.log(`Raw length: ${raw.length} | Cleaned length: ${cleaned.length}`);
fs.writeFileSync('icf_test_fixed.html', cleaned);
console.log('Saved icf_test_fixed.html');
