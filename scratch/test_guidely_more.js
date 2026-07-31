async function testMoreEndpoints() {
  const testId = "28220622";
  const pkgId = "13121";
  const endpoints = [
    `https://webapi.guidely.in/mock-test-details/${pkgId}`,
    `https://webapi.guidely.in/mock-test-questions-view/${testId}`,
    `https://webapi.guidely.in/get-mock-questions/${testId}`,
    `https://webapi.guidely.in/mock-test-solutions/${testId}/1`,
    `https://webapi.guidely.in/mock-test-question-details/${testId}`,
    `https://webapi.guidely.in/mock-test-result-solutions/${testId}`,
    `https://webapi.guidely.in/mock-question-results/${testId}`,
    `https://webapi.guidely.in/quiz-solutions/${testId}`,
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const txt = await res.text();
      console.log(`[${res.status}] ${ep} => ${txt.substring(0, 150)}`);
    } catch(e) {
      console.log(`[ERR] ${ep} => ${e.message}`);
    }
  }
}
testMoreEndpoints();
