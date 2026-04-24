const puppeteer = require('puppeteer');
const path = require('path');
const http = require('http');
const static = require('node-static');
const assert = require('assert');

let fileServer;
let httpServer;

(async () => {
  console.log('Starting static server...');
  fileServer = new static.Server(path.join(__dirname, '..'));

  httpServer = http.createServer((request, response) => {
    request.addListener('end', () => {
      fileServer.serve(request, response);
    }).resume();
  });

  httpServer.listen(8081);
  await new Promise(resolve => setTimeout(resolve, 500));

  let browser;
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({ 
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 600 });
    
    // Catch page errors to fail the test immediately
    page.on('pageerror', err => {
      console.error(`Page error: ${err.toString()}`);
      process.exit(1);
    });

    // Make the environment fully deterministic
    await page.evaluateOnNewDocument(() => {
      let seed = 1;
      // Simple predictable pseudo-random generator
      Math.random = () => {
          const x = Math.sin(seed++) * 10000;
          return x - Math.floor(x);
      };
      // Disable auto-render loop so we can advance time manually
      window.requestAnimationFrame = () => {};
    });

    console.log('Loading game...');
    await page.goto('http://localhost:8081/index.html');
    
    // Wait for the game to initialize
    await page.waitForFunction(() => window.gameAPI !== undefined && window.gameAPI.getUnits().length > 0);

    // Helper to force a render and take a screenshot
    const takeScreenshot = async (filename) => {
        await page.evaluate(() => {
            // Force a render frame so visual state updates for the screenshot
            const scene = window.gameAPI.getTownCenter().parent;
            const camera = window.gameAPI.getCamera();
            const renderer = window.document.querySelector('canvas');
            // Re-bind renderer from canvas context just for testing if needed,
            // or we can rely on triggering animate() once.
            if (window.animate) {
                 window.animate(); // Won't loop if requestAnimationFrame is mocked
            } else {
                 // Hack to trigger a render using the existing renderer
                 const evt = new Event('resize');
                 window.dispatchEvent(evt); // Often forces a redraw
            }
        });
        // We'll just take a screenshot directly, the game usually renders right away anyway
        // or the visual DOM updates. But because we disabled requestAnimationFrame, 
        // we might need to manually trigger the render function. 
        // We will call the global 'animate' one time manually without requestAnimationFrame looping it.
        await page.evaluate(() => {
           // Temporarily restore requestAnimationFrame just for one frame to render
           const temp = window.requestAnimationFrame;
           window.requestAnimationFrame = (cb) => { cb(); window.requestAnimationFrame = temp; };
        });
        await page.screenshot({ path: filename });
    };

    console.log('Starting Hermetic Simulation Tests...');
    await takeScreenshot('01_initial_game_start.png');

    // Get initial state
    let townStats = await page.evaluate(() => window.gameAPI.getTown());
    assert.strictEqual(townStats.wood, 0, 'Town should start with 0 wood');
    await takeScreenshot('02_assert_wood_is_zero.png');

    // 1. Simulate Input: Drag selection box to select units
    console.log('Simulating drag selection...');
    // We mock the mouse events directly via the API we exposed, or use page.mouse
    await page.mouse.move(300, 200);
    await page.mouse.down();
    await page.mouse.move(500, 400); // Drag over the center where units spawn
    await page.mouse.up();

    const selectedUnitsCount = await page.evaluate(() => 
      window.gameAPI.getUnits().filter(u => u.material.color.getHex() === 0x0000ff).length
    );
    console.log(`Units selected: ${selectedUnitsCount}`);
    assert.ok(selectedUnitsCount > 0, 'At least one unit should be selected after drag');
    await takeScreenshot('03_assert_units_selected.png');

    // 2. Simulate Input: Right-click to send units somewhere (e.g., a tree)
    // In our deterministic world, we know there's a tree somewhere. Let's find one.
    console.log('Simulating right click on a tree...');
    await page.evaluate(() => {
        // Find a tree in the scene programmatically to get exact coordinates
        const scene = window.gameAPI.getTownCenter().parent; // hack to get scene
        let treeTarget = null;
        scene.children.forEach(child => {
            if (child.userData && child.userData.type === 'tree') {
                treeTarget = child;
            }
        });
        
        if (treeTarget) {
            // Project 3D coordinate of the trunk to 2D screen coordinate
            const trunk = treeTarget.children[0];
            const pos = new window.gameAPI.THREE.Vector3();
            trunk.getWorldPosition(pos);
            
            const camera = window.gameAPI.getCamera();
            camera.updateMatrixWorld();
            pos.project(camera);
            const x = (pos.x + 1) * window.innerWidth / 2;
            const y = (-pos.y + 1) * window.innerHeight / 2;
            
            // Trigger right click
            window.gameAPI.triggerRightClick(x, y);
        }
    });

    // 3. Simulate Time Elapsed
    console.log('Advancing time to allow units to walk and gather...');
    await page.evaluate(() => {
        const dt = 0.016; // Simulate 1 frame
        const totalFrames = 60 * 60; // 60 seconds of game time (fast-forwarded instantly)
        for (let i = 0; i < totalFrames; i++) {
            window.gameAPI.updateUnits(dt);
        }
    });

    // 4. Assert State Changes
    // Check specific unit state first to debug
    const unitState = await page.evaluate(() => {
       const selectedUnit = window.gameAPI.getUnits().find(u => u.material.color.getHex() === 0x0000ff);
       if (!selectedUnit) return null;
       return {
           status: selectedUnit.status,
           hasTarget: !!selectedUnit.target,
           targetType: selectedUnit.target ? selectedUnit.target.userData.type : null,
           position: selectedUnit.position,
           pathLength: selectedUnit.path.length
       };
    });
    console.log(`Unit state after simulation:`, unitState);
    
    townStats = await page.evaluate(() => window.gameAPI.getTown());
    console.log(`Town wood after simulation: ${townStats.wood}`);
    assert.ok(townStats.wood > 0, 'Town should have gathered wood after 60 seconds of simulated time');
    await takeScreenshot('04_assert_wood_gathered.png');

    assert.ok(['gathering_wood', 'depositing_wood', 'walking'].includes(unitState.status), 'Unit should be involved in wood gathering cycle');
    await takeScreenshot('05_assert_unit_in_gathering_cycle.png');

    console.log('✅ All e2e tests passed successfully in hermetic environment.');

  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    if (httpServer) httpServer.close();
  }
})();