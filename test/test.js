const puppeteer = require('puppeteer');
const path = require('path');
const { exec } = require('child_process');

let serverProcess;

(async () => {
  // Start the http-server
  serverProcess = exec('npx http-server ../ -p 8080', (error, stdout, stderr) => {
    if (error) {
      console.error(`http-server error: ${error}`);
      return;
    }
    console.log(`http-server stdout: ${stdout}`);
    console.error(`http-server stderr: ${stderr}`);
  });

  // Wait for the server to start (give it a moment)
  await new Promise(resolve => setTimeout(resolve, 2000));

  const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error(`Browser console error: ${msg.text()}`);
      process.exit(1);
    }
  });

  await page.goto('http://localhost:8080');
  
  await page.screenshot({ path: 'screenshot.png' });

  await browser.close();

  // Stop the http-server
  if (serverProcess) {
    serverProcess.kill();
  }

  console.log('No console errors found.');
})();