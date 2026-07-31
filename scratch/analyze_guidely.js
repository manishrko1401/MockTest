const fs = require('fs');

async function main() {
  console.log("Searching for getMockTestSolutions in bundle...");
  const res = await fetch('https://guidely.in/main-es2015.e8a8201cb3ce53e0fc22.js');
  const text = await res.text();

  const idx = text.indexOf('getMockTestSolutions');
  if (idx !== -1) {
    console.log("Found getMockTestSolutions at index:", idx);
    console.log(text.substring(Math.max(0, idx - 200), idx + 400));
  } else {
    console.log("getMockTestSolutions not found directly.");
  }

  // Also search for /v1/ endpoints
  const v1Matches = text.match(/\/v1\/[a-zA-Z0-9\.\-_/]+/g) || [];
  console.log("\nAll /v1/ endpoints:");
  console.log([...new Set(v1Matches)]);
}

main().catch(console.error);
