const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ executablePath: '/Users/jairoh/vscodeprojects/gclitest/test/chrome/mac_arm-138.0.7204.92/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error(`Browser console error: ${msg.text()}`);
      process.exit(1);
    }
  });

  await page.goto(`file://${path.join(__dirname, '..', 'index.html')}`);
  
  await browser.close();
})();