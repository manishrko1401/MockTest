const fs = require('fs');
const path = require('path');

async function uploadCtetPaper2() {
  const jsonPath = path.join(__dirname, '../CTET Paper 2 + Social Science Full Test 1.json');
  console.log('Reading CTET Paper 2 JSON file:', jsonPath);
  
  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const questions = JSON.parse(rawData);

  console.log(`Loaded ${questions.length} questions from JSON file.`);

  console.log('Posting custom questions package to web app /api/db endpoint...');
  const res = await fetch('http://localhost:3000/api/db', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-admin-key': 'super_secret_admin_key_2026'
    },
    body: JSON.stringify({
      action: 'save-custom-questions',
      data: {
        testId: 'ctet_paper2',
        title: 'CTET 2026 Paper-II (Social Science) Full Test 1',
        questions: questions
      }
    })
  });

  const responseData = await res.json();
  console.log('API Response:', responseData);

  if (responseData.success) {
    console.log(`✅ SUCCESS! Saved ${questions.length} questions for CTET Paper 2!`);
  } else {
    console.error('❌ Failed to save questions:', responseData.error || responseData.message);
  }
}

uploadCtetPaper2().catch(err => {
  console.error('Execution error:', err);
});
