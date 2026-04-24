# E2E Hermetic Test Report

## Overview
A fully hermetic, deterministic End-to-End (E2E) testing environment was established for the 3D RTS game using Puppeteer and Node.js. The test suite simulates user input, manually advances game time, and asserts internal game state changes without relying on real-world time or browser rendering speeds.

## Hermetic Testing Strategy

To achieve a strictly hermetic environment, several techniques were employed within the Puppeteer testing script (`test/test.js`):

1.  **Deterministic Randomness:** The native `Math.random` function was overridden with a seeded pseudo-random number generator before the game scripts executed. This ensures that randomly placed entities (trees, mines, villagers) spawn at the exact same coordinates on every test run.
2.  **Manual Time Progression:** The native `requestAnimationFrame` was disabled to pause the game's automatic render loop. A new global API (`window.gameAPI.updateUnits`) was exposed in `main.js`. This allows the test script to manually call the update loop with a fixed `deltaTime` inside a `for` loop, effectively simulating minutes of gameplay in milliseconds.
3.  **API Exposure:** A `window.gameAPI` object was injected into the game's global scope, granting the test script direct access to internal variables (units, town stats, the grid, camera) and internal input handlers (`onRightClick`, `onMouseDown`, `onMouseUp`).

## Test Scenario: Wood Gathering Cycle
The implemented test verifies the complete "wood gathering" behavior loop:

1.  **Selection:** Simulates a mouse drag over the center of the map to select multiple villagers. Asserts that units were selected.
2.  **Targeting:** Programmatically locates a tree in the 3D scene, projects its 3D coordinates to 2D screen coordinates using the active OrthographicCamera, and simulates a right-click.
3.  **Time Simulation:** Fast-forwards the game state by 60 seconds (3,600 frames at 60 FPS).
4.  **Assertion:** Verifies that the global `town.wood` resource count is greater than 0, proving that the villagers successfully path-find, gather, return to the Town Center, and deposit the resource.

## Critical Bugs Identified and Fixed
During the development of the test suite, the deterministic environment exposed three critical logic bugs in `main.js` that were subsequently fixed:

1.  **Pathfinding to Obstacles:** 
    *   *Issue:* Trees and mines were marked as unwalkable (`setWalkableAt(x, y, false)`). When a user clicked a tree, `PF.AStarFinder` returned an empty path because the target destination was inside a wall.
    *   *Fix:* Before calculating the path, the grid clone was updated to temporarily set the target resource's grid cell to walkable (`gridClone.setWalkableAt(endX, endY, true)`).
2.  **Resource Identification:** 
    *   *Issue:* Upon reaching a destination, the `Villager.update` method checked `this.target.parent.userData.type` to determine the resource type. However, `this.target` was already the root object, causing the parent reference to point to the `Scene`, which had no `userData.type`. Villagers would get permanently stuck in a 'walking' status.
    *   *Fix:* Updated the check to inspect `this.target.userData.type` directly.
3.  **Return Journey Movement:** 
    *   *Issue:* If a villager was in the `gathering_wood` status but was physically too far from the tree (e.g., just finished depositing at the Town Center), the logic set their `targetPosition` but lacked the code to translate their `position` vector, leaving them stranded.
    *   *Fix:* Added the missing vector math logic to move the villager towards the target if they are out of range while in a gathering state.

## Conclusion
The hermetic testing setup is complete and passing. It successfully abstracts away the unpredictability of browser rendering, allowing for rapid, reliable verification of complex game logic loops.