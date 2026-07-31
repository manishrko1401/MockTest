async function testEndpoints() {
  const testId = "28220622";
  const pkgId = "13121";

  const urls = [
    `https://webapi.guidely.in/mock-test-solutions/${testId}`,
    `https://webapi.guidely.in/mock-test-solutions/${pkgId}`,
    `https://web.guidely.in/api/v1/mock-test-solutions/${testId}`,
    `https://web.guidely.in/api/v1/mock-test-solutions/${pkgId}`,
    `https://webapi.guidely.in/mock-test-solution/${testId}`,
    `https://webapi.guidely.in/mock-test-questions/${testId}`,
  ];

  for (const url of urls) {
    try {
      console.log(`Fetching: ${url}`);
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'application/json, text/plain, */*'
        }
      });
      console.log(`Status: ${res.status}`);
      if (res.ok) {
        const json = await res.json();
        console.log("Success response keys:", Object.keys(json));
        const sampleStr = JSON.stringify(json).substring(0, 500);
        console.log("Sample:", sampleStr);
      } else {
        const text = await res.text();
        console.log("Err response:", text.substring(0, 200));
      }
    } catch(e) {
      console.error("Fetch failed:", e.message);
    }
    console.log("---");
  }
}

testEndpoints();
