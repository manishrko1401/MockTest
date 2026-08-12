async function testRegexWipe() {
  const url = 'https://rojgarresult.com/sbi-junior-associates-clerk-jca-2026/';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();

  const articleStart = html.indexOf('<article');
  const articleEnd = html.indexOf('</article>', articleStart);
  let articleHtml = html.substring(articleStart, articleEnd + 10);

  const entryContentIdx = articleHtml.indexOf('class="entry-content"');
  let extracted = articleHtml.substring(articleHtml.lastIndexOf('<div', entryContentIdx));

  console.log('Original Extracted Length:', extracted.length);
  console.log('Original Table Count:', (extracted.match(/<table/gi) || []).length);

  let clean = extracted;

  // Test Regex 1: header
  clean = clean.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
  console.log('After Step 1 (header): length =', clean.length, ', tables =', (clean.match(/<table/gi) || []).length);

  // Test Regex 2: h1
  clean = clean.replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, '');
  console.log('After Step 2 (h1): length =', clean.length, ', tables =', (clean.match(/<table/gi) || []).length);

  // Test Regex 3: h2
  clean = clean.replace(/<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?(?:Application\s*Form|Online\s*Form|Recruitment\s*20\d\d)(?:(?!<\/h2>)[\s\S])*?<\/h2>/gi, (match) => {
    if (/(?:overview|how\s*to|step|instruction|guide|process)/i.test(match)) return match;
    return '';
  });
  console.log('After Step 3 (h2): length =', clean.length, ', tables =', (clean.match(/<table/gi) || []).length);

  // Test Regex 4: Post Date
  clean = clean.replace(/<p[^>]*>(?:(?!<\/p>)[\s\S]){1,300}?Post\s*(?:Update\s*)?Date(?:(?!<\/p>)[\s\S]){1,300}?<\/p>/gi, '');
  console.log('After Step 4 (Post Date): length =', clean.length, ', tables =', (clean.match(/<table/gi) || []).length);

  // Test Regex 5: Short Description (individual sub-patterns)
  let testClean = clean;
  testClean = testClean.replace(/<li[^>]*>(?:(?!<\/li>)[\s\S])*?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/li>)[\s\S])*?<\/li>/gi, '');
  console.log('  5a (li): tables =', (testClean.match(/<table/gi) || []).length);

  testClean = testClean.replace(/<p[^>]*>(?:(?!<\/p>)[\s\S]){1,400}?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/p>)[\s\S]){1,400}?<\/p>/gi, '');
  console.log('  5b (p): tables =', (testClean.match(/<table/gi) || []).length);

  testClean = testClean.replace(/<h[2-4][^>]*>(?:(?!<\/h[2-4]>)[\s\S])*?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/h[2-4]>)[\s\S])*?<\/h[2-4]>/gi, '');
  console.log('  5c (h2-h4): tables =', (testClean.match(/<table/gi) || []).length);

  let testDivClean = testClean;
  testDivClean = testDivClean.replace(/<div[^>]*>(?:(?!<\/div>)[\s\S]){1,400}?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/div>)[\s\S]){1,400}?<\/div>/gi, '');
  console.log('  5d (div): tables =', (testDivClean.match(/<table/gi) || []).length, '<-- LOOK AT THIS!');

  testClean = testClean.replace(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?(?:Short\s*(?:Description|Details|Info|Information)|संक्षिप्त\s*विवरण)(?:(?!<\/tr>)[\s\S])*?<\/tr>/gi, '');
  console.log('  5e (tr): tables =', (testClean.match(/<table/gi) || []).length);
}

testRegexWipe().catch(console.error);
