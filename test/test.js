const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch();
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