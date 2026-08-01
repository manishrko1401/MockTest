const fs = require('fs');

async function probeAdda247Endpoints() {
  const packageId = "1054004";
  const mockId = "110157";

  const endpoints = [
    `https://www.adda247.com/api/v1/test-series-portal/${packageId}/${mockId}`,
    `https://www.adda247.com/api/v1/mock-test-solution/${mockId}`,
    `https://www.adda247.com/api/v1/mock-test-questions/${mockId}`,
    `https://www.adda247.com/api/v2/mock-test-solution/${mockId}`,
    `https://store.adda247.com/api/v1/mock-test-solutions/${mockId}`,
    `https://store.adda247.com/api/v1/test-series/${packageId}/mock/${mockId}`,
    `https://cp-api.careerpower.in/mock-test-solutions/${mockId}`,
    `https://testportal-api.adda247.com/api/v1/solution/${mockId}`,
    `https://www.adda247.com/_next/data/mock-test-solution/${mockId}.json`,
    `https://www.adda247.com/test-series-portal/${packageId}/${mockId}/COMPLETED/NICL%20Assistants%20Prelims%202026%20Full%20Mock%20Test%20-01`
  ];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Referer': `https://www.adda247.com/test-series-portal/${packageId}/${mockId}/COMPLETED/NICL%20Assistants%20Prelims%202026%20Full%20Mock%20Test%20-01`
  };

  for (const url of endpoints) {
    console.log(`\n----------------------------------------------`);
    console.log(`Testing API URL: ${url}`);
    try {
      const res = await fetch(url, { headers, redirect: 'follow' });
      console.log(`Status: ${res.status} ${res.statusText}`);
      const contentType = res.headers.get('content-type') || '';
      console.log(`Content-Type: ${contentType}`);

      if (res.ok) {
        if (contentType.includes('json')) {
          const json = await res.json();
          console.log(`SUCCESS! JSON Response keys:`, Object.keys(json));
          fs.writeFileSync(`scratch/adda247_api_success_${Date.now()}.json`, JSON.stringify(json, null, 2));
        } else {
          const text = await res.text();
          console.log(`Text length: ${text.length} chars. Sample: ${text.substring(0, 200)}`);
          if (text.includes('__NEXT_DATA__') || text.includes('INITIAL_STATE') || text.includes('questions')) {
            console.log(`>>> Found data indicators in HTML response!`);
            fs.writeFileSync(`scratch/adda247_html_sample.html`, text);
          }
        }
      }
    } catch (err) {
      console.log(`Error: ${err.message}`);
    }
  }
}

probeAdda247Endpoints();
