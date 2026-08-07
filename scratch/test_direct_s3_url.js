async function testDirectS3UrlSave() {
  const testTitle = 'CTET Paper 2 + Social Science Full Test 7';
  const directS3Url = 'https://fly.storage.tigris.dev/mocktest-assets/questions_ctet_paper_2___social_science_full_test_7.json';

  console.log(`Testing direct S3 URL upload/save for test "${testTitle}"...`);
  console.log(`Direct S3 URL: ${directS3Url}`);

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
        questionsUrl: directS3Url
      }
    })
  });

  const responseData = await res.json();
  console.log('API Response:', responseData);

  if (responseData.success) {
    console.log(`✅ SUCCESS! Directly attached S3 URL to "${testTitle}"! Total questions detected: ${responseData.questionsCount}`);
  } else {
    console.error('❌ Failed to attach direct S3 URL:', responseData.error || responseData.message);
  }
}

testDirectS3UrlSave().catch(err => console.error('Execution error:', err));
