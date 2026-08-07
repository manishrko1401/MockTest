const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../CTET Paper 2 + Social Science Full Test 1.json');
const rawData = fs.readFileSync(filePath, 'utf-8');
const data = JSON.parse(rawData);

console.log('--- FILE OVERVIEW ---');
console.log('Top level keys:', Object.keys(data));

if (Array.isArray(data)) {
  console.log('Total items in root array:', data.length);
  const sample = data[0];
  console.log('Sample item keys:', Object.keys(sample));
  console.log('Unique section names:', [...new Set(data.map(q => q.section || q.subject || q.sectionName))]);
} else {
  console.log('Data details:', JSON.stringify(data).substring(0, 500));
  if (data.questions && Array.isArray(data.questions)) {
    console.log('Total questions count:', data.questions.length);
    console.log('Unique section names:', [...new Set(data.questions.map(q => q.section || q.subject || q.sectionName))]);
  }
}
