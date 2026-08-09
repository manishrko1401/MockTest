const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function testRpscExtraTime() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const artifactDir = `C:\\Users\\painl\\.gemini\\antigravity-ide\\brain\\9f8a20fb-792d-4394-bf33-f4a49a8eb601`;

  // 0. Clear any saved session in localStorage first
  console.log('Opening page and clearing ongoing sessions...');
  await page.goto('http://localhost:3000/exam/rpsc_ras_prelims_full_1', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    try { localStorage.clear(); } catch(e) {}
  });
  await page.goto('http://localhost:3000/exam/rpsc_ras_prelims_full_1', { waitUntil: 'networkidle2' });

  // 1. Instructions Screen
  console.log('On Instructions screen. Checking agreement checkbox...');
  await page.waitForSelector('input[type="checkbox"]', { timeout: 10000 });
  await page.click('input[type="checkbox"]');
  
  console.log('Clicking Start Test button...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('ready to begin') || b.textContent.includes('प्रारंभ'));
    if (btn) btn.click();
  });

  // 2. Exam Screen Started
  console.log('Waiting for exam screen to load...');
  await new Promise(r => setTimeout(r, 2000));

  const startScreenshotPath = path.join(artifactDir, 'rpsc_test_started.png');
  await page.screenshot({ path: startScreenshotPath, fullPage: false });
  console.log(`Saved start screenshot: ${startScreenshotPath}`);

  // 3. Wait for 10-second timer to expire (wait 12 seconds)
  console.log('Waiting 12 seconds for 10-second timer expiry...');
  await new Promise(r => setTimeout(r, 12000));

  // 4. Check for Rules Modal
  console.log('Checking for Rules Modal...');
  const modalText = await page.evaluate(() => {
    const body = document.body.innerText;
    return body.includes('Hey! You need to mark at least one option') || body.includes('ध्यान दें!') ? body : null;
  });

  console.log('Is Rules Modal visible?:', !!modalText);

  const modalScreenshotPath = path.join(artifactDir, 'rpsc_rules_modal.png');
  await page.screenshot({ path: modalScreenshotPath, fullPage: false });
  console.log(`Saved Rules Modal screenshot: ${modalScreenshotPath}`);

  // 5. Click "Okay, Understood" button
  console.log('Clicking Okay, Understood button...');
  const clickedOk = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Okay, Understood') || b.textContent.includes('समझ गया'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  console.log('Clicked Okay, Understood button:', clickedOk);
  await new Promise(r => setTimeout(r, 2000));

  // 6. Check Extra Time Mode UI
  console.log('Checking Extra Time Mode UI...');
  const extraTimeState = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    const isExtraTimeTimer = bodyText.includes('EXTRA TIME');
    const optionEExists = bodyText.includes('(E) Leave Question Unattempted');
    return { isExtraTimeTimer, optionEExists };
  });

  console.log('Extra time UI state:', extraTimeState);

  const extraTimeScreenshotPath = path.join(artifactDir, 'rpsc_extra_time_mode.png');
  await page.screenshot({ path: extraTimeScreenshotPath, fullPage: false });
  console.log(`Saved Extra Time screenshot: ${extraTimeScreenshotPath}`);

  // 7. Select Option E
  console.log('Selecting Option (E)...');
  const selectedE = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label'));
    const labelE = labels.find(l => l.innerText.includes('(E) Leave Question Unattempted') || l.innerText.includes('Option (E)'));
    if (labelE) {
      labelE.click();
      return true;
    }
    return false;
  });
  console.log('Option (E) clicked:', selectedE);

  await new Promise(r => setTimeout(r, 1000));

  const optionEScreenshotPath = path.join(artifactDir, 'rpsc_option_e_selected.png');
  await page.screenshot({ path: optionEScreenshotPath, fullPage: false });
  console.log(`Saved Option E selected screenshot: ${optionEScreenshotPath}`);

  await browser.close();
  console.log('RPSC RAS Extra Time test completed successfully!');
}

testRpscExtraTime().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
