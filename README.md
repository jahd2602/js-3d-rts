# 3D RTS Game

A simple 3D Real-Time Strategy (RTS) game built with Three.js.

## Features

*   **3D Environment:** A simple 3D world with a ground plane, a town center, and trees.
*   **Camera Controls:** The camera pans when the mouse is near the edge of the screen.
*   **Unit Selection:**
    *   Select individual units by clicking on them.
    *   Select multiple units by drawing a selection rectangle.
*   **Unit Movement:** Right-click on the ground to move selected units.
*   **Resource Gathering:**
    *   Villagers can be commanded to gather wood from trees.
    *   Right-click on a tree to send a villager to gather wood.
    *   The villager will gather wood and return to the town center to deposit it.
    *   The villager will automatically return to the same tree to continue gathering.
*   **UI:**
    *   A UI panel at the bottom of the screen displays information about the selected unit(s).
    *   A global wood counter at the top left of the screen displays the town's total wood.
    *   Text above each villager displays its current status (e.g., "waiting", "walking", "gathering", "depositing").

## How it Works

The game is built using JavaScript and the Three.js library. The entire game is contained within a single `index.html` file.

*   **Three.js:** Used for creating the 3D scene, objects, and rendering.
*   **HTML/CSS:** Used for the UI elements, such as the selection box, info panel, and wood counter.
*   **JavaScript:** Used for all the game logic, including unit movement, selection, and resource gathering.

To run the game, simply open the `index.html` file in a web browser.
