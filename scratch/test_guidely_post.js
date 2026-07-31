async function testPostParams() {
  const endpoints = [
    'https://webapi.guidely.in/mock-test-solutions',
    'https://webapi.guidely.in/mock-test-question-details',
    'https://webapi.guidely.in/mock-question-results'
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        },
        body: JSON.stringify({
          mock_test_id: "28220622",
          test_id: "28220622",
          package_id: "13121",
          user_id: "1"
        })
      });
      const txt = await res.text();
      console.log(`[POST ${res.status}] ${ep} => ${txt.substring(0, 300)}`);
    } catch(e) {
      console.log(`[ERR] ${ep} => ${e.message}`);
    }
  }
}
testPostParams();
