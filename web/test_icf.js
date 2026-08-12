const https = require('https');
const fs = require('fs');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', err => reject(err));
  });
}

function extractNoticeContent(pageHtml) {
  if (!pageHtml) return null;

  let contentStart = -1;
  const entryHeaderIdx = pageHtml.indexOf('class="entry-header"');
  const entryContentIdx = pageHtml.indexOf('class="entry-content"');

  if (entryHeaderIdx !== -1) {
    contentStart = entryHeaderIdx;
    const headerTagIdx = pageHtml.lastIndexOf('<header', entryHeaderIdx);
    if (headerTagIdx !== -1) contentStart = headerTagIdx;
  } else if (entryContentIdx !== -1) {
    contentStart = entryContentIdx;
    const divTagIdx = pageHtml.lastIndexOf('<div', entryContentIdx);
    if (divTagIdx !== -1) contentStart = divTagIdx;
  } else {
    const h1Idx = pageHtml.indexOf('<h1');
    if (h1Idx !== -1) contentStart = h1Idx;
  }

  if (contentStart === -1) return null;

  let contentEnd = -1;

  // Find the Important Links table end — include it fully
  let linksHeadingIdx = pageHtml.toLowerCase().indexOf('useful important links', contentStart);
  if (linksHeadingIdx === -1) {
    linksHeadingIdx = pageHtml.toLowerCase().indexOf('important links', contentStart);
  }

  if (linksHeadingIdx !== -1 && linksHeadingIdx > contentStart) {
    const tableEndIdx = pageHtml.indexOf('</table>', linksHeadingIdx);
    if (tableEndIdx !== -1) {
      contentEnd = tableEndIdx + 8; // include </table>
    }
  }

  if (contentEnd === -1) {
    const faqIdx = pageHtml.toLowerCase().indexOf('important faqs', contentStart);
    if (faqIdx !== -1 && faqIdx > contentStart) {
      contentEnd = faqIdx;
    } else {
      const articleEndIdx = pageHtml.indexOf('</article>', contentStart);
      if (articleEndIdx !== -1) {
        contentEnd = articleEndIdx;
      } else {
        contentEnd = Math.min(contentStart + 25000, pageHtml.length);
      }
    }
  }

  let extracted = pageHtml.substring(contentStart, contentEnd);

  return { contentStart, contentEnd, length: extracted.length, rawExtracted: extracted };
}

async function testICF() {
  const html = await fetchUrl('https://rojgarresult.com/icf-apprentices-2026/');
  const res = extractNoticeContent(html);
  console.log(`ICF raw extracted length: ${res.length}`);
  fs.writeFileSync('icf_test_raw.html', res.rawExtracted);
  console.log('Saved icf_test_raw.html');
}

testICF();
