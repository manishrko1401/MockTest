async function main() {
  const url = 'https://rojgarresult.com/sbi-junior-associates-clerk-jca-2026/';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  console.log('Total HTML length:', html.length);

  const articleStart = html.indexOf('<article');
  const articleEnd = html.indexOf('</article>', articleStart);
  console.log('<article> start:', articleStart, 'end:', articleEnd);

  const tableIndices = [];
  let pos = 0;
  while ((pos = html.indexOf('<table', pos)) !== -1) {
    tableIndices.push(pos);
    pos += 6;
  }

  console.log(`Found ${tableIndices.length} <table> elements in pageHtml:`);
  tableIndices.forEach((idx, i) => {
    const snippet = html.substring(idx, idx + 200).replace(/\n/g, ' ');
    const isInsideArticle = idx >= articleStart && idx <= articleEnd;
    console.log(`[Table ${i + 1}] at pos ${idx} (Inside Article: ${isInsideArticle}): ${snippet}`);
  });
}

main().catch(console.error);
