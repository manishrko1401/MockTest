async function inspectGuidelyResponse() {
  const url1 = "https://webapi.guidely.in/mock-test-solution/28220622";
  const url2 = "https://webapi.guidely.in/mock-test-questions/28220622";

  for (const url of [url1, url2]) {
    console.log(`\n==============================================`);
    console.log(`Fetching: ${url}`);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    });
    const json = await res.json();
    console.log("Keys in response:", Object.keys(json));
    if (json.data) console.log("Keys in json.data:", Object.keys(json.data));
    if (json.result) console.log("Keys in json.result:", Object.keys(json.result));
    
    // Save to disk to inspect
    const filename = url.includes('solution') ? 'guidely_solution_sample.json' : 'guidely_questions_sample.json';
    const fs = require('fs');
    fs.writeFileSync(filename, JSON.stringify(json, null, 2));
    console.log(`Saved full response to ${filename}`);
  }
}

inspectGuidelyResponse().catch(console.error);
