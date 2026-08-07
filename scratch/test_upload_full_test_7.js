const fs = require('fs');
const path = require('path');

async function testUploadFullTest7() {
  const jsonPath = path.join(__dirname, '../CTET Paper 2 + Social Science Full Test 1.json');
  console.log('Reading sample questions package:', jsonPath);
  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const questions = JSON.parse(rawData);

  const testTitle = 'CTET Paper 2 + Social Science Full Test 7';
  console.log(`Testing import of ${questions.length} questions for target test: "${testTitle}"...`);

  const res = await fetch('http://localhost:3000/api/db', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': 'super_secret_admin_key_2026'
    },
    body: JSON.stringify({
      action: 'save-custom-questions',
      data: {
        testId: testTitle,
        title: testTitle,
        questions: questions
      }
    })
  });

  const responseData = await res.json();
  console.log('API Response:', responseData);

  if (responseData.success) {
    console.log(`✅ SUCCESS! Saved ${questions.length} questions for "${testTitle}"!`);
  } else {
    console.error('❌ Failed to save questions:', responseData.error || responseData.message);
  }
}

testUploadFullTest7().catch(err => {
  console.error('Execution error:', err);
});
