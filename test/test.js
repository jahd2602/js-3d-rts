const puppeteer = require('puppeteer');
const path = require('path');
const http = require('http');
const static = require('node-static');

let fileServer;
let httpServer;

(async () => {
  // Create a node-static server instance
  fileServer = new static.Server(path.join(__dirname, '..'));

  // Create an http server
  httpServer = http.createServer((request, response) => {
    request.addListener('end', () => {
      fileServer.serve(request, response);
    }).resume();
  });

  // Start the http server
  httpServer.listen(8080);

  // Wait for the server to start (give it a moment)
  await new Promise(resolve => setTimeout(resolve, 2000));

  let browser;
  try {
    browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
    const page = await browser.newPage();
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Browser console error: ${msg.text()}`);
        process.exit(1);
      }
    });

    page.on('requestfailed', request => {
      console.error(`Failed to load: ${request.url()} - ${request.failure().errorText}`);
      console.log(`Requested URL: ${request.url()}`);
      process.exit(1);
    });

    page.on('response', async response => {
      if (!response.ok() && response.url() !== 'http://localhost:8080/favicon.ico') {
        console.error(`HTTP Error: ${response.status()} for ${response.url()}`);
        process.exit(1);
      }
    });

    await page.goto('http://localhost:8080/index.html');
    
    await page.screenshot({ path: 'screenshot.png' });

    console.log('No console errors found.');
  } finally {
    if (browser) {
      await browser.close();
    }
    // Stop the http-server
    if (httpServer) {
      httpServer.close();
    }
  }
})();