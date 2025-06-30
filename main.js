import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

let scene, camera, renderer, labelRenderer;
let ground, townCenter;
let units = [], trees = [];
let selectedUnits = [];
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const panSpeed = 0.1;
let town = { wood: 0, gold: 0, stone: 0 };

class Villager extends THREE.Mesh {
    constructor(geometry, material, labelRenderer) {
        super(geometry, material);
        this.status = 'waiting';
        this.hitpoints = 10;
        this.wood = 0;
        this.gold = 0;
        this.stone = 0;
        this.target = null;
        this.targetPosition = null;

        const labelDiv = document.createElement('div');
        labelDiv.className = 'label';
        labelDiv.textContent = this.status;
        this.statusLabel = new CSS2DObject(labelDiv);
        this.statusLabel.position.set(0, 1.5, 0);
        this.add(this.statusLabel);
    }

    update(deltaTime, townCenter, town) {
        this.statusLabel.element.textContent = this.status;

        if (this.status === 'gathering_wood') {
            if (!this.targetPosition) {
                this.targetPosition = this.target.position.clone();
            }

            const distanceToTarget = this.position.distanceTo(this.targetPosition);
            if (distanceToTarget > 1) {
                const direction = this.targetPosition.clone().sub(this.position).normalize();
                this.position.add(direction.multiplyScalar(0.1));
            } else {
                this.wood += 2 * deltaTime;
                if (this.wood >= 10) {
                    this.targetPosition = townCenter.position.clone();
                    this.status = 'depositing_wood';
                }
            }
        } else if (this.status === 'depositing_wood') {
            const distanceToTownCenter = this.position.distanceTo(townCenter.position);
            if (distanceToTownCenter > 2) {
                const direction = townCenter.position.clone().sub(this.position).normalize();
                this.position.add(direction.multiplyScalar(0.1));
            } else {
                town.wood += Math.floor(this.wood);
                this.wood = 0;
                this.status = 'gathering_wood';
                this.targetPosition = this.target.position.clone();
                woodCounterElement.textContent = `Wood: ${town.wood} Gold: ${town.gold} Stone: ${town.stone}`;
            }
        } else if (this.status === 'gathering_gold') {
            if (!this.targetPosition) {
                this.targetPosition = this.target.position.clone();
            }

            const distanceToTarget = this.position.distanceTo(this.targetPosition);
            if (distanceToTarget > 1) {
                const direction = this.targetPosition.clone().sub(this.position).normalize();
                this.position.add(direction.multiplyScalar(0.1));
            } else {
                this.gold += 1 * deltaTime;
                if (this.gold >= 10) {
                    this.targetPosition = townCenter.position.clone();
                    this.status = 'depositing_gold';
                }
            }
        } else if (this.status === 'depositing_gold') {
            const distanceToTownCenter = this.position.distanceTo(townCenter.position);
            if (distanceToTownCenter > 2) {
                const direction = townCenter.position.clone().sub(this.position).normalize();
                this.position.add(direction.multiplyScalar(0.1));
            } else {
                town.gold += Math.floor(this.gold);
                this.gold = 0;
                this.status = 'gathering_gold';
                this.targetPosition = this.target.position.clone();
                woodCounterElement.textContent = `Wood: ${town.wood} Gold: ${town.gold} Stone: ${town.stone}`;
            }
        } else if (this.status === 'gathering_stone') {
            if (!this.targetPosition) {
                this.targetPosition = this.target.position.clone();
            }

            const distanceToTarget = this.position.distanceTo(this.targetPosition);
            if (distanceToTarget > 1) {
                const direction = this.targetPosition.clone().sub(this.position).normalize();
                this.position.add(direction.multiplyScalar(0.1));
            } else {
                this.stone += 1.5 * deltaTime;
                if (this.stone >= 10) {
                    this.targetPosition = townCenter.position.clone();
                    this.status = 'depositing_stone';
                }
            }
        } else if (this.status === 'depositing_stone') {
            const distanceToTownCenter = this.position.distanceTo(townCenter.position);
            if (distanceToTownCenter > 2) {
                const direction = townCenter.position.clone().sub(this.position).normalize();
                this.position.add(direction.multiplyScalar(0.1));
            } else {
                town.stone += Math.floor(this.stone);
                this.stone = 0;
                this.status = 'gathering_stone';
                this.targetPosition = this.target.position.clone();
                woodCounterElement.textContent = `Wood: ${town.wood} Gold: ${town.gold} Stone: ${town.stone}`;
            }
        } else if (this.status === 'building') {
            if (!this.targetPosition) {
                this.targetPosition = this.target.position.clone();
            }

            const distanceToTarget = this.position.distanceTo(this.targetPosition);
            if (distanceToTarget > 1) {
                const direction = this.targetPosition.clone().sub(this.position).normalize();
                this.position.add(direction.multiplyScalar(0.1));
            } else {
                // Simulate building progress
                if (!this.target.buildProgress) {
                    this.target.buildProgress = 0;
                }
                this.target.buildProgress += deltaTime;
                if (this.target.buildProgress >= 5) { // 5 seconds to build
                    this.target.userData.built = true;
                    this.status = 'waiting';
                    this.targetPosition = null;
                    console.log('Building complete!');
                }
            }
        } else if (this.targetPosition) {
            const direction = this.targetPosition.clone().sub(this.position).normalize();
            this.position.add(direction.multiplyScalar(0.1));

            if (this.position.distanceTo(this.targetPosition) < 0.1) {
                this.targetPosition = null;
                this.status = 'waiting';
            }
        }
    }
}

class Swordsman extends THREE.Mesh {
    constructor(geometry, material, labelRenderer) {
        super(geometry, material);
        this.status = 'waiting';
        this.hitpoints = 50;
        this.attack = 10;
        this.defense = 5;
        this.target = null;
        this.targetPosition = null;

        const labelDiv = document.createElement('div');
        labelDiv.className = 'label';
        labelDiv.textContent = this.status;
        this.statusLabel = new CSS2DObject(labelDiv);
        this.statusLabel.position.set(0, 1.5, 0);
        this.add(this.statusLabel);
    }

    update(deltaTime) {
        this.statusLabel.element.textContent = this.status;

        if (this.targetPosition) {
            const direction = this.targetPosition.clone().sub(this.position).normalize();
            this.position.add(direction.multiplyScalar(0.1));

            if (this.position.distanceTo(this.targetPosition) < 0.1) {
                this.targetPosition = null;
                this.status = 'waiting';
            }
        }
    }
}

let selectionBoxElement = document.getElementById('selection-box');
let infoPanelElement = document.getElementById('info-panel');
let woodCounterElement = document.getElementById('wood-counter');
let startPoint = new THREE.Vector2();
let endPoint = new THREE.Vector2();
let isDragging = false;

init();
animate();

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbfd1e5);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 20, 30);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Label Renderer
    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    document.body.appendChild(labelRenderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 10, 0);
    scene.add(directionalLight);

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Town Center
    townCenter = createTownCenter();
    scene.add(townCenter);

    // Trees
    for (let i = 0; i < 20; i++) {
        const tree = createTree(new THREE.Vector3(Math.random() * 80 - 40, 0, Math.random() * 80 - 40));
        trees.push(tree);
        scene.add(tree);
    }

    // Gold Mines
    for (let i = 0; i < 5; i++) {
        const goldMine = createGoldMine(new THREE.Vector3(Math.random() * 80 - 40, 0, Math.random() * 80 - 40));
        trees.push(goldMine); // Reusing trees array for now, will refactor later
        scene.add(goldMine);
    }

    // Stone Mines
    for (let i = 0; i < 5; i++) {
        const stoneMine = createStoneMine(new THREE.Vector3(Math.random() * 80 - 40, 0, Math.random() * 80 - 40));
        trees.push(stoneMine); // Reusing trees array for now, will refactor later
        scene.add(stoneMine);
    }

    // Units
    const unitGeometry = new THREE.BoxGeometry(1, 1, 1);
    const unitMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    for (let i = 0; i < 10; i++) {
        const villager = new Villager(unitGeometry, unitMaterial, labelRenderer);
        villager.position.set(Math.random() * 40 - 20, 0.5, Math.random() * 40 - 20);
        units.push(villager);
        scene.add(villager);
    }

    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('mousemove', onMouseMove, false);
    window.addEventListener('mousedown', onMouseDown, false);
    window.addEventListener('mouseup', onMouseUp, false);
    window.addEventListener('contextmenu', onRightClick, false);
    window.addEventListener('keydown', onKeyDown, false);
}

function createTownCenter() {
    const townCenterGroup = new THREE.Group();

    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const baseGeometry = new THREE.BoxGeometry(10, 4, 10);
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 2;
    townCenterGroup.add(base);

    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0xA52A2A });
    const roofGeometry = new THREE.ConeGeometry(8, 4, 4);
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 6;
    roof.rotation.y = Math.PI / 4;
    townCenterGroup.add(roof);

    townCenterGroup.position.set(0, 0, 0);
    return townCenterGroup;
}

function createTree(position) {
    const treeGroup = new THREE.Group();

    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.5, 4);
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 2;
    treeGroup.add(trunk);

    const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x006400 });
    const leavesGeometry = new THREE.SphereGeometry(3, 8, 6);
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leaves.position.y = 5;
    treeGroup.add(leaves);

    treeGroup.position.copy(position);
    return treeGroup;
}

function createGoldMine(position) {
    const goldMineGroup = new THREE.Group();

    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700 }); // Gold color
    const baseGeometry = new THREE.SphereGeometry(2, 16, 16);
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 1;
    goldMineGroup.add(base);

    goldMineGroup.position.copy(position);
    return goldMineGroup;
}

function createStoneMine(position) {
    const stoneMineGroup = new THREE.Group();

    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 }); // Stone color
    const baseGeometry = new THREE.BoxGeometry(3, 3, 3);
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 1.5;
    stoneMineGroup.add(base);

    stoneMineGroup.position.copy(position);
    return stoneMineGroup;
}

function createBarracks(position) {
    const barracksGroup = new THREE.Group();

    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const baseGeometry = new THREE.BoxGeometry(8, 6, 8);
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 3;
    barracksGroup.add(base);

    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0xA52A2A });
    const roofGeometry = new THREE.ConeGeometry(6, 3, 4);
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 6;
    roof.rotation.y = Math.PI / 4;
    barracksGroup.add(roof);

    barracksGroup.position.copy(position);
    barracksGroup.userData.type = 'barracks';
    barracksGroup.createSwordsman = function() {
        if (town.gold >= 60 && town.wood >= 20) { // Example costs
            town.gold -= 60;
            town.wood -= 20;
            const swordsmanGeometry = new THREE.BoxGeometry(1, 1, 1);
            const swordsmanMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff });
            const swordsman = new Swordsman(swordsmanGeometry, swordsmanMaterial, labelRenderer);
            swordsman.position.set(this.position.x + Math.random() * 2 - 1, 0.5, this.position.z + Math.random() * 2 - 1);
            units.push(swordsman);
            scene.add(swordsman);
            woodCounterElement.textContent = `Wood: ${town.wood} Gold: ${town.gold} Stone: ${town.stone}`;
            console.log('Swordsman created!');
        } else {
            console.log('Not enough resources to create Swordsman!');
        }
    };
    return barracksGroup;
}

function onKeyDown(event) {
    if (event.key === 'b') { // Press 'b' for barracks
        buildingMode = 'barracks';
        console.log('Building Barracks mode activated.');
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
    mouse.x = event.clientX;
    mouse.y = event.clientY;

    if (isDragging) {
        endPoint.set(event.clientX, event.clientY);
        selectionBoxElement.style.width = Math.abs(endPoint.x - startPoint.x) + 'px';
        selectionBoxElement.style.height = Math.abs(endPoint.y - startPoint.y) + 'px';
        selectionBoxElement.style.left = Math.min(startPoint.x, endPoint.x) + 'px';
        selectionBoxElement.style.top = Math.min(startPoint.y, endPoint.y) + 'px';
    }
}

function onMouseDown(event) {
    if (event.button === 0) { // Left mouse button
        isDragging = true;
        selectionBoxElement.style.display = 'block';
        startPoint.set(event.clientX, event.clientY);
    }
}

function onMouseUp(event) {
    if (event.button === 0) { // Left mouse button
        isDragging = false;
        selectionBoxElement.style.display = 'none';
        selectUnits();
    }
}

function onRightClick(event) {
    event.preventDefault();
    let screenCoords = new THREE.Vector2((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(screenCoords, camera);
    const intersects = raycaster.intersectObjects([ground]); // Only intersect with ground for placement

    if (intersects.length > 0) {
        const intersectionPoint = intersects[0].point;

        if (buildingMode) {
            if (buildingMode === 'barracks') {
                const barracksSite = createBuildingSite(intersectionPoint, 'barracks');
                scene.add(barracksSite);
                console.log('Barracks building site placed!');
            }
            buildingMode = null; // Exit building mode after placement
        } else {
            const intersectedObject = intersects[0].object;
            if (intersectedObject.geometry.type === 'CylinderGeometry') { // It's a tree trunk
                const tree = intersectedObject.parent;
                selectedUnits.forEach(villager => {
                    villager.target = tree;
                    villager.status = 'gathering_wood';
                });
            } else if (intersectedObject.geometry.type === 'SphereGeometry') { // It's a gold mine
                const goldMine = intersectedObject.parent;
                selectedUnits.forEach(villager => {
                    villager.target = goldMine;
                    villager.status = 'gathering_gold';
                });
            } else if (intersectedObject.geometry.type === 'BoxGeometry') { // It's a stone mine
                const stoneMine = intersectedObject.parent;
                selectedUnits.forEach(villager => {
                    villager.target = stoneMine;
                    villager.status = 'gathering_stone';
                });
            } else if (intersectedObject === ground) {
                const targetPosition = intersects[0].point;
                selectedUnits.forEach(villager => {
                    villager.targetPosition = targetPosition;
                    villager.status = 'walking';
                });
            } else if (intersectedObject.parent.userData.type === 'building_site') {
                const buildingSite = intersectedObject.parent;
                selectedUnits.forEach(villager => {
                    villager.target = buildingSite;
                    villager.status = 'building';
                });
            }
        }
    }
}

function selectUnits() {
    clearSelection();
    const selectionBox = new THREE.Box2();
    const start = new THREE.Vector2(Math.min(startPoint.x, endPoint.x), Math.min(startPoint.y, endPoint.y));
    const end = new THREE.Vector2(Math.max(startPoint.x, endPoint.x), Math.max(startPoint.y, endPoint.y));
    selectionBox.setFromPoints([start, end]);

    units.forEach(unit => {
        const screenPos = unit.position.clone().project(camera);
        const screenCoords = new THREE.Vector2((screenPos.x + 1) * window.innerWidth / 2, (-screenPos.y + 1) * window.innerHeight / 2);

        if (selectionBox.containsPoint(screenCoords)) {
            selectedUnits.push(unit);
            unit.material.color.set(0x0000ff);
        }
    });
    updateUI();
}

function clearSelection() {
    selectedUnits.forEach(unit => {
        unit.material.color.set(0xff0000);
    });
    selectedUnits = [];
    updateUI();
}

function updateUI() {
    if (selectedUnits.length === 1) {
        const unit = selectedUnits[0];
        infoPanelElement.innerHTML = `
            <div>Unit: Villager</div>
            <div>Hitpoints: ${unit.hitpoints}</div>
            <div>Wood: ${Math.floor(unit.wood)}</div>
            <div>Gold: ${Math.floor(unit.gold)}</div>
            <div>Stone: ${Math.floor(unit.stone)}</div>
        `;
    } else if (selectedUnits.length > 1) {
        infoPanelElement.innerHTML = `<div>${selectedUnits.length} units selected</div>`;
    } else {
        infoPanelElement.innerHTML = '';
    }
}

function animate() {
    requestAnimationFrame(animate);

    // Camera Pan
    if (mouse.x < 50) {
        camera.position.x -= panSpeed;
    } else if (mouse.x > window.innerWidth - 50) {
        camera.position.x += panSpeed;
    }

    if (mouse.y < 50) {
        camera.position.z -= panSpeed;
    } else if (mouse.y > window.innerHeight - 50) {
        camera.position.z += panSpeed;
    }

    updateUnits();
    updateUI();

    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}

function updateUnits() {
    const deltaTime = 0.016; // Assume 60 FPS

    units.forEach(unit => {
        unit.update(deltaTime, townCenter, town);
    });
}