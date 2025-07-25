import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';


let scene, camera, renderer, labelRenderer;
let ground, townCenter;
let units = [], trees = [];
let selectedUnits = [];
let ghostBuilding = null;
let buildingMode = null;
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const panSpeed = 0.1;
let town = { wood: 0, gold: 0, stone: 0, food: 0, currentAge: 1, researchedTechnologies: { swordsmanAttack: false } };
const gridSize = 100;
const grid = new PF.Grid(gridSize, gridSize);

class Villager extends THREE.Mesh {
    constructor(geometry, material, labelRenderer) {
        super(geometry, material);
        this.status = 'waiting';
        this.hitpoints = 10;
        this.wood = 0;
        this.gold = 0;
        this.stone = 0;
        this.food = 0;
        this.target = null;
        this.targetPosition = null;
        this.path = [];
        this.speed = 2;

        const labelDiv = document.createElement('div');
        labelDiv.className = 'label';
        labelDiv.textContent = this.status;
        this.statusLabel = new CSS2DObject(labelDiv);
        this.statusLabel.position.set(0, 1.5, 0);
        this.add(this.statusLabel);
    }

    update(deltaTime, townCenter, town) {
        const statusEmojis = {
            'waiting': '🧍',
            'building': '🔨',
            'gathering_wood': '🪓',
            'depositing_wood': ' depositing 🪵',
            'gathering_gold': '⛏️',
            'depositing_gold': ' depositing 💰',
            'gathering_stone': '⛏️',
            'depositing_stone': ' depositing 🪨',
            'gathering_food': '🌾',
            'depositing_food': ' depositing 🥩',
            'walking': '🚶'
        };
        this.statusLabel.element.textContent = statusEmojis[this.status] || this.status;

        if (this.path.length > 0) {
            const targetNode = this.path[0];
            const targetPosition = new THREE.Vector3(targetNode[0] - gridSize / 2, 0.5, targetNode[1] - gridSize / 2);
            const distanceToTarget = this.position.distanceTo(targetPosition);

            if (distanceToTarget > 0.1) {
                const direction = targetPosition.clone().sub(this.position).normalize();
                this.position.add(direction.multiplyScalar(this.speed * deltaTime));
            } else {
                this.path.shift();
                if (this.path.length === 0) {
                    if (this.status === 'building') {
                        // Simulate building progress
                        if (!this.target.buildProgress) {
                            this.target.buildProgress = 0;
                        }
                        this.target.buildProgress += deltaTime;
                        if (this.target.buildProgress >= 5) { // 5 seconds to build
                            this.target.userData.built = true;
                            this.target.children[0].material.opacity = 1; // Make base opaque
                            this.target.children[1].material.opacity = 1; // Make roof opaque
                            this.status = 'waiting';
                            this.targetPosition = null;
                            console.log('Building complete!');
                            if (this.target.userData.buildingType === 'farm') {
                                this.status = 'gathering_food';
                                this.target = this.target; // Set target to the newly built farm
                                this.targetPosition = this.target.position.clone();
                            }
                        }
                    } else {
                        if (this.target) {
                            if (this.target.parent.userData.type === 'tree') {
                                this.status = 'gathering_wood';
                            } else if (this.target.parent.userData.type === 'goldMine') {
                                this.status = 'gathering_gold';
                            } else if (this.target.parent.userData.type === 'stoneMine') {
                                this.status = 'gathering_stone';
                            } else if (this.target.parent.userData.type === 'farm') {
                                this.status = 'gathering_food';
                            }
                        } else {
                            this.status = 'waiting';
                        }
                    }
                }
            }
        }

        if (this.status === 'gathering_wood') {
            if (this.position.distanceTo(this.target.position) < 2) {
                this.wood += 2 * deltaTime;
                if (this.wood >= 10) {
                    this.targetPosition = townCenter.position.clone();
                    this.status = 'depositing_wood';
                }
            } else {
                this.targetPosition = this.target.position.clone();
            }
        } else if (this.status === 'depositing_wood') {
            const distanceToTownCenter = this.position.distanceTo(townCenter.position);
            if (distanceToTownCenter > 2) {
                const direction = townCenter.position.clone().sub(this.position).normalize();
                this.position.add(direction.multiplyScalar(this.speed * deltaTime));
            } else {
                town.wood += Math.floor(this.wood);
                this.wood = 0;
                this.status = 'gathering_wood';
                this.targetPosition = this.target.position.clone();
                woodDisplayElement.textContent = `🪵: ${town.wood}`;
                goldDisplayElement.textContent = `💰: ${town.gold}`;
                stoneDisplayElement.textContent = `🪨: ${town.stone}`;
            }
        } else if (this.status === 'gathering_gold') {
            if (this.position.distanceTo(this.target.position) < 2) {
                this.gold += 1 * deltaTime;
                if (this.gold >= 10) {
                    this.targetPosition = townCenter.position.clone();
                    this.status = 'depositing_gold';
                }
            } else {
                this.targetPosition = this.target.position.clone();
            }
        } else if (this.status === 'depositing_gold') {
            const distanceToTownCenter = this.position.distanceTo(townCenter.position);
            if (distanceToTownCenter > 2) {
                const direction = townCenter.position.clone().sub(this.position).normalize();
                this.position.add(direction.multiplyScalar(this.speed * deltaTime));
            } else {
                town.gold += Math.floor(this.gold);
                this.gold = 0;
                this.status = 'gathering_gold';
                this.targetPosition = this.target.position.clone();
                woodDisplayElement.textContent = `🪵: ${town.wood}`;
                goldDisplayElement.textContent = `💰: ${town.gold}`;
                stoneDisplayElement.textContent = `🪨: ${town.stone}`;
            }
        } else if (this.status === 'gathering_stone') {
            if (this.position.distanceTo(this.target.position) < 2) {
                this.stone += 1.5 * deltaTime;
                if (this.stone >= 10) {
                    this.targetPosition = townCenter.position.clone();
                    this.status = 'depositing_stone';
                }
            } else {
                this.targetPosition = this.target.position.clone();
            }
        } else if (this.status === 'depositing_stone') {
            const distanceToTownCenter = this.position.distanceTo(townCenter.position);
            if (distanceToTownCenter > 2) {
                const direction = townCenter.position.clone().sub(this.position).normalize();
                this.position.add(direction.multiplyScalar(this.speed * deltaTime));
            } else {
                town.stone += Math.floor(this.stone);
                this.stone = 0;
                this.status = 'gathering_stone';
                this.targetPosition = this.target.position.clone();
                woodDisplayElement.textContent = `🪵: ${town.wood}`;
                goldDisplayElement.textContent = `💰: ${town.gold}`;
                stoneDisplayElement.textContent = `🪨: ${town.stone}`;
            }
        } else if (this.status === 'gathering_food') {
            if (this.position.distanceTo(this.target.position) < 2) {
                this.food += 1.5 * deltaTime;
                if (this.food >= 10) {
                    this.targetPosition = townCenter.position.clone();
                    this.status = 'depositing_food';
                }
            } else {
                this.targetPosition = this.target.position.clone();
            }
        } else if (this.status === 'depositing_food') {
            const distanceToTownCenter = this.position.distanceTo(townCenter.position);
            if (distanceToTownCenter > 2) {
                const direction = townCenter.position.clone().sub(this.position).normalize();
                this.position.add(direction.multiplyScalar(this.speed * deltaTime));
            } else {
                town.food += Math.floor(this.food);
                this.food = 0;
                this.status = 'gathering_food';
                this.targetPosition = this.target.position.clone();
                woodDisplayElement.textContent = `🪵: ${town.wood}`;
                goldDisplayElement.textContent = `💰: ${town.gold}`;
                stoneDisplayElement.textContent = `🪨: ${town.stone}`;
                foodDisplayElement.textContent = `🥩: ${town.food}`;
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
        this.speed = 2;
        this.attackCooldown = 1; // seconds
        this.lastAttackTime = 0;

        const labelDiv = document.createElement('div');
        labelDiv.className = 'label';
        labelDiv.textContent = this.status;
        this.statusLabel = new CSS2DObject(labelDiv);
        this.statusLabel.position.set(0, 1.5, 0);
        this.add(this.statusLabel);
    }

    update(deltaTime) {
        const statusEmojis = {
            'waiting': '🧍',
            'attacking': '⚔️',
            'walking': '🚶'
        };
        this.statusLabel.element.textContent = `${statusEmojis[this.status] || this.status} ❤️: ${this.hitpoints}`;

        if (this.status === 'attacking') {
            if (this.target && this.target.hitpoints > 0) {
                const distanceToTarget = this.position.distanceTo(this.target.position);
                if (distanceToTarget > 2) { // Move closer to attack
                    const direction = this.target.position.clone().sub(this.position).normalize();
                    this.position.add(direction.multiplyScalar(this.speed * deltaTime));
                } else {
                    if (performance.now() / 1000 - this.lastAttackTime > this.attackCooldown) {
                        let damage = this.attack;
                        if (town.researchedTechnologies.swordsmanAttack) {
                            damage *= 1.2; // 20% damage increase after research
                        }
                        this.target.hitpoints -= damage; // Simple damage calculation
                        this.lastAttackTime = performance.now() / 1000;
                        console.log(`Swordsman attacked! Target HP: ${this.target.hitpoints}`);
                        if (this.target.hitpoints <= 0) {
                            console.log('Target destroyed!');
                            scene.remove(this.target);
                            if (this.target === townCenter) {
                                console.log('Game Over! Town Center destroyed.');
                                // Implement game over logic here (e.g., display message, stop game loop)
                            } else {
                                units = units.filter(unit => unit !== this.target);
                            }
                            this.status = 'waiting';
                            this.target = null;
                        }
                    }
                }
            } else {
                this.status = 'waiting';
                this.target = null;
            }
        } else if (this.targetPosition) {
            const direction = this.targetPosition.clone().sub(this.position).normalize();
            this.position.add(direction.multiplyScalar(this.speed * deltaTime));

            if (this.position.distanceTo(this.targetPosition) < 0.1) {
                this.targetPosition = null;
                this.status = 'waiting';
            }
        }
    }
}

let selectionBoxElement = document.getElementById('selection-box');
let infoPanelElement = document.getElementById('info-panel');
let woodDisplayElement = document.getElementById('wood-display');
let goldDisplayElement = document.getElementById('gold-display');
let stoneDisplayElement = document.getElementById('stone-display');
let foodDisplayElement = document.getElementById('food-display');
let borderPanCheckbox = document.getElementById('border-pan-checkbox');
infoPanelElement.addEventListener('mouseenter', () => isMouseOverUI = true);
infoPanelElement.addEventListener('mouseleave', () => isMouseOverUI = false);
let startPoint = new THREE.Vector2();
let endPoint = new THREE.Vector2();
let isDragging = false;
let isMouseOverUI = false;

init();
animate();

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbfd1e5);

    // Camera
    const aspect = window.innerWidth / window.innerHeight;
            const frustumSize = 60; // Adjust this value to control the zoom level
            camera = new THREE.OrthographicCamera(frustumSize * aspect / -2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / -2, 0.1, 1000);
            camera.position.set(50, 50, 50); // Set camera position for isometric view
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
    for (let i = 0; i < 10; i++) {
        const unitMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Create a new material for each unit
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
    townCenterGroup.hitpoints = 500; // Town Center HP
    const x = Math.floor(townCenterGroup.position.x + gridSize / 2);
    const y = Math.floor(townCenterGroup.position.z + gridSize / 2);
    grid.setWalkableAt(x, y, false);
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
    treeGroup.userData.type = 'tree';
    const x = Math.floor(treeGroup.position.x + gridSize / 2);
    const y = Math.floor(treeGroup.position.z + gridSize / 2);
    grid.setWalkableAt(x, y, false);
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
    goldMineGroup.userData.type = 'goldMine';
    const x = Math.floor(goldMineGroup.position.x + gridSize / 2);
    const y = Math.floor(goldMineGroup.position.z + gridSize / 2);
    grid.setWalkableAt(x, y, false);
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
    stoneMineGroup.userData.type = 'stoneMine';
    const x = Math.floor(stoneMineGroup.position.x + gridSize / 2);
    const y = Math.floor(stoneMineGroup.position.z + gridSize / 2);
    grid.setWalkableAt(x, y, false);
    return stoneMineGroup;
}

function createBarracks(position = new THREE.Vector3()) {
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, transparent: true, opacity: 0.5 });
    const baseGeometry = new THREE.BoxGeometry(8, 6, 8);
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 3;

    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0xA52A2A, transparent: true, opacity: 0.5 });
    const roofGeometry = new THREE.ConeGeometry(6, 3, 4);
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 6;
    roof.rotation.y = Math.PI / 4;

    const barracksGroup = new THREE.Group();
    barracksGroup.add(base);
    barracksGroup.add(roof);

    barracksGroup.position.copy(position);
    barracksGroup.userData.type = 'barracks';
    const x = Math.floor(barracksGroup.position.x + gridSize / 2);
    const y = Math.floor(barracksGroup.position.z + gridSize / 2);
    grid.setWalkableAt(x, y, false);
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
            woodDisplayElement.textContent = `🪵: ${town.wood}`;
            goldDisplayElement.textContent = `💰: ${town.gold}`;
            stoneDisplayElement.textContent = `🪨: ${town.stone}`;
            foodDisplayElement.textContent = `🥩: ${town.food}`;
            console.log('Swordsman created! ⚔️');
        } else {
            console.log('Not enough resources to create Swordsman!');
        }
    };
    return barracksGroup;
}

function createFarm(position = new THREE.Vector3()) {
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, transparent: true, opacity: 0.5 });
    const baseGeometry = new THREE.BoxGeometry(6, 2, 6);
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 1;

    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x006400, transparent: true, opacity: 0.5 });
    const roofGeometry = new THREE.PlaneGeometry(4, 4);
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.rotation.x = -Math.PI / 2;
    roof.position.y = 2.1;

    const farmGroup = new THREE.Group();
    farmGroup.add(base);
    farmGroup.add(roof);

    farmGroup.position.copy(position);
    farmGroup.userData.type = 'farm';
    const x = Math.floor(farmGroup.position.x + gridSize / 2);
    const y = Math.floor(farmGroup.position.z + gridSize / 2);
    grid.setWalkableAt(x, y, false);
    return farmGroup;
}

function advanceAge() {
    if (town.currentAge === 1 && town.wood >= 500 && town.gold >= 200) { // Example costs for Age 2
        town.wood -= 500;
        town.gold -= 200;
        town.currentAge = 2;
        woodCounterElement.textContent = `Wood: ${town.wood} Gold: ${town.gold} Stone: ${town.stone}`;
        console.log('Advanced to Age 2!');
    } else if (town.currentAge === 2 && town.wood >= 1000 && town.gold >= 500 && town.stone >= 300) { // Example costs for Age 3
        town.wood -= 1000;
        town.gold -= 500;
        town.stone -= 300;
        town.currentAge = 3;
        woodCounterElement.textContent = `Wood: ${town.wood} Gold: ${town.gold} Stone: ${town.stone}`;
        console.log('Advanced to Age 3! You Win!');
        // Implement win logic here (e.g., display message, stop game loop)
    } else {
        console.log('Not enough resources to advance age!');
    }
}

function researchSwordsmanAttack() {
    if (town.currentAge >= 2 && town.gold >= 100 && town.stone >= 50 && !town.researchedTechnologies.swordsmanAttack) {
        town.gold -= 100;
        town.stone -= 50;
        town.researchedTechnologies.swordsmanAttack = true;
        woodCounterElement.textContent = `Wood: ${town.wood} Gold: ${town.gold} Stone: ${town.stone}`;
        console.log('Swordsman attack upgraded!');
    } else {
        console.log('Cannot research Swordsman attack upgrade!');
    }
}



function onKeyDown(event) {
    if (event.key === 'b') { // Press 'b' for barracks
        buildingMode = 'barracks';
        console.log('Building Barracks mode activated.');
    } else if (event.key === 'f') { // Press 'f' for farm
        buildingMode = 'farm';
        console.log('Building Farm mode activated.');
    }
}

function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 60; // Should match the value in init()
    camera.left = frustumSize * aspect / -2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
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
    } else if (buildingMode) {
        raycaster.setFromCamera(new THREE.Vector2((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1), camera);
        const intersects = raycaster.intersectObjects([ground]);
        if (intersects.length > 0) {
            const intersectionPoint = intersects[0].point;
            if (!ghostBuilding) {
                if (buildingMode === 'barracks') {
                    ghostBuilding = createBarracks();
                } else if (buildingMode === 'farm') {
                    ghostBuilding = createFarm();
                }
                ghostBuilding.children[0].material.transparent = true;
                ghostBuilding.children[0].material.opacity = 0.5; // Make it transparent
                scene.add(ghostBuilding);
            }
            ghostBuilding.position.copy(intersectionPoint);
        } else {
            if (ghostBuilding) {
                scene.remove(ghostBuilding);
                ghostBuilding = null;
            }
        }
    }
}

function onMouseDown(event) {
    if (event.target.tagName === 'BUTTON') return;
    if (event.button === 0) { // Left mouse button
        if (buildingMode) {
            raycaster.setFromCamera(new THREE.Vector2((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1), camera);
            const intersects = raycaster.intersectObjects([ground]);
            if (intersects.length > 0) {
                const intersectionPoint = intersects[0].point;
                let newBuilding;
                if (buildingMode === 'barracks') {
                    newBuilding = createBarracks(intersectionPoint);
                } else if (buildingMode === 'farm') {
                    newBuilding = createFarm(intersectionPoint);
                }
                scene.add(newBuilding);
                console.log(`${buildingMode} placed at ${intersectionPoint.x}, ${intersectionPoint.z}`);
                
                // Assign villager to build
                if (selectedUnits.length > 0 && selectedUnits[0] instanceof Villager) {
                    selectedUnits[0].target = newBuilding;
                    selectedUnits[0].status = 'building';
                }

                buildingMode = null; // Exit building mode after placement
                if (ghostBuilding) {
                    scene.remove(ghostBuilding);
                    ghostBuilding = null;
                }
            }
        } else {
            if (isMouseOverUI) return;
            isDragging = true;
            selectionBoxElement.style.display = 'block';
            startPoint.set(event.clientX, event.clientY);
        }
    }
}

function onMouseUp(event) {
    if (event.button === 0) { // Left mouse button
        isDragging = false;
        selectionBoxElement.style.display = 'none';

        if (startPoint.x === event.clientX && startPoint.y === event.clientY) { // Single click
            selectSingleUnit(event);
        } else { // Drag selection
            selectUnits();
        }
    }
}

function onRightClick(event) {
    event.preventDefault();
    let screenCoords = new THREE.Vector2((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(screenCoords, camera);
    const intersects = raycaster.intersectObjects([...trees.map(t => t.children[0]), ...trees.filter(t => t.userData.type === 'goldMine').map(t => t.children[0]), ...trees.filter(t => t.userData.type === 'stoneMine').map(t => t.children[0]), ...trees.filter(t => t.userData.type === 'farm').map(t => t.children[0]), ground]);

    if (intersects.length > 0) {
        const intersectionPoint = intersects[0].point;

        if (buildingMode) {
            if (buildingMode === 'barracks') {
                const barracksSite = createBuildingSite(intersectionPoint, 'barracks');
                scene.add(barracksSite);
                console.log('Barracks building site placed!');
            } else if (buildingMode === 'farm') {
                const farmSite = createBuildingSite(intersectionPoint, 'farm');
                scene.add(farmSite);
                console.log('Farm building site placed!');
            }
            buildingMode = null; // Exit building mode after placement
        } else {
            const intersectedObject = intersects[0].object;
            const finder = new PF.AStarFinder();
            const gridClone = grid.clone();
            if (intersectedObject.geometry.type === 'CylinderGeometry') { // It's a tree trunk
                const tree = intersectedObject.parent;
                selectedUnits.forEach(villager => {
                    const startX = Math.floor(villager.position.x + gridSize / 2);
                    const startY = Math.floor(villager.position.z + gridSize / 2);
                    const endX = Math.floor(tree.position.x + gridSize / 2);
                    const endY = Math.floor(tree.position.z + gridSize / 2);
                    const path = finder.findPath(startX, startY, endX, endY, gridClone);
                    villager.path = path;
                    villager.target = tree;
                    villager.status = 'walking';
                });
            } else if (intersectedObject.geometry.type === 'SphereGeometry') { // It's a gold mine
                const goldMine = intersectedObject.parent;
                selectedUnits.forEach(villager => {
                    const startX = Math.floor(villager.position.x + gridSize / 2);
                    const startY = Math.floor(villager.position.z + gridSize / 2);
                    const endX = Math.floor(goldMine.position.x + gridSize / 2);
                    const endY = Math.floor(goldMine.position.z + gridSize / 2);
                    const path = finder.findPath(startX, startY, endX, endY, gridClone);
                    villager.path = path;
                    villager.target = goldMine;
                    villager.status = 'walking';
                });
            } else if (intersectedObject.geometry.type === 'BoxGeometry') { // It's a stone mine
                const stoneMine = intersectedObject.parent;
                selectedUnits.forEach(villager => {
                    const startX = Math.floor(villager.position.x + gridSize / 2);
                    const startY = Math.floor(villager.position.z + gridSize / 2);
                    const endX = Math.floor(stoneMine.position.x + gridSize / 2);
                    const endY = Math.floor(stoneMine.position.z + gridSize / 2);
                    const path = finder.findPath(startX, startY, endX, endY, gridClone);
                    villager.path = path;
                    villager.target = stoneMine;
                    villager.status = 'walking';
                });
            } else if (intersectedObject.parent.userData.type === 'farm') { // It's a farm
                const farm = intersectedObject.parent;
                selectedUnits.forEach(villager => {
                    const startX = Math.floor(villager.position.x + gridSize / 2);
                    const startY = Math.floor(villager.position.z + gridSize / 2);
                    const endX = Math.floor(farm.position.x + gridSize / 2);
                    const endY = Math.floor(farm.position.z + gridSize / 2);
                    const path = finder.findPath(startX, startY, endX, endY, gridClone);
                    villager.path = path;
                    villager.target = farm;
                    villager.status = 'walking';
                });
            } else if (intersectedObject === ground) {
                const targetPosition = intersects[0].point;
                const numUnits = selectedUnits.length;
                const angleStep = (Math.PI * 2) / numUnits;
                const radius = 3; // Distance from the center point

                selectedUnits.forEach((unit, index) => {
                    const angle = index * angleStep;
                    const offsetX = radius * Math.cos(angle);
                    const offsetY = radius * Math.sin(angle);
                    const individualTargetPosition = new THREE.Vector3(targetPosition.x + offsetX, targetPosition.y, targetPosition.z + offsetY);

                    const startX = Math.floor(unit.position.x + gridSize / 2);
                    const startY = Math.floor(unit.position.z + gridSize / 2);
                    const endX = Math.floor(individualTargetPosition.x + gridSize / 2);
                    const endY = Math.floor(individualTargetPosition.z + gridSize / 2);
                    const path = finder.findPath(startX, startY, endX, endY, gridClone);
                    unit.path = path;
                    unit.status = 'walking';
                });
            } else if (intersectedObject.parent.userData.type === 'building_site') {
                const buildingSite = intersectedObject.parent;
                selectedUnits.forEach(villager => {
                    const startX = Math.floor(villager.position.x + gridSize / 2);
                    const startY = Math.floor(villager.position.z + gridSize / 2);
                    const endX = Math.floor(buildingSite.position.x + gridSize / 2);
                    const endY = Math.floor(buildingSite.position.z + gridSize / 2);
                    const path = finder.findPath(startX, startY, endX, endY, gridClone);
                    villager.path = path;
                    villager.target = buildingSite;
                    villager.status = 'building';
                });
            } else if (intersectedObject.parent.userData.type === 'barracks') {
                const barracks = intersectedObject.parent;
                selectedUnits.forEach(unit => {
                    if (unit instanceof Villager) {
                        const startX = Math.floor(unit.position.x + gridSize / 2);
                        const startY = Math.floor(unit.position.z + gridSize / 2);
                        const endX = Math.floor(barracks.position.x + gridSize / 2);
                        const endY = Math.floor(barracks.position.z + gridSize / 2);
                        const path = finder.findPath(startX, startY, endX, endY, gridClone);
                        unit.path = path;
                        unit.status = 'walking'; // Villagers can't interact with barracks directly yet
                    } else if (unit instanceof Swordsman) {
                        const startX = Math.floor(unit.position.x + gridSize / 2);
                        const startY = Math.floor(unit.position.z + gridSize / 2);
                        const endX = Math.floor(barracks.position.x + gridSize / 2);
                        const endY = Math.floor(barracks.position.z + gridSize / 2);
                        const path = finder.findPath(startX, startY, endX, endY, gridClone);
                        unit.path = path;
                        unit.status = 'walking'; // Swordsmen can't interact with barracks directly yet
                    }
                });
                selectedUnits = [barracks]; // Select the barracks
            } else if (units.includes(intersectedObject.parent)) { // Check if the intersected object is a unit
                const targetUnit = intersectedObject.parent;
                selectedUnits.forEach(unit => {
                    if (unit instanceof Swordsman) {
                        const startX = Math.floor(unit.position.x + gridSize / 2);
                        const startY = Math.floor(unit.position.z + gridSize / 2);
                        const endX = Math.floor(targetUnit.position.x + gridSize / 2);
                        const endY = Math.floor(targetUnit.position.z + gridSize / 2);
                        const path = finder.findPath(startX, startY, endX, endY, gridClone);
                        unit.path = path;
                        unit.target = targetUnit;
                        unit.status = 'attacking';
                    } else {
                        const startX = Math.floor(unit.position.x + gridSize / 2);
                        const startY = Math.floor(unit.position.z + gridSize / 2);
                        const endX = Math.floor(targetUnit.position.x + gridSize / 2);
                        const endY = Math.floor(targetUnit.position.z + gridSize / 2);
                        const path = finder.findPath(startX, startY, endX, endY, gridClone);
                        unit.path = path;
                        unit.status = 'walking';
                    }
                });
            }
        }
    }
}

function selectSingleUnit(event) {
    clearSelection();
    let screenCoords = new THREE.Vector2((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(screenCoords, camera);
    const intersects = raycaster.intersectObjects(units);

    if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        selectedUnits.push(intersectedObject);
        intersectedObject.material.color.set(0x0000ff);
    }
    updateUI();
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
        if (unit instanceof Villager) {
            infoPanelElement.innerHTML = `
                <div>🧍 Villager</div>
                <div>❤️: ${unit.hitpoints}</div>
                <div>🪵: ${Math.floor(unit.wood)}</div>
                <div>💰: ${Math.floor(unit.gold)}</div>
                <div>🪨: ${Math.floor(unit.stone)}</div>
                <div>🥩: ${Math.floor(unit.food)}</div>
                <div>
                    <button id="build-barracks">Build Barracks (B)</button>
                    <button id="build-farm">Build Farm (F)</button>
                </div>
            `;
            document.getElementById('build-barracks').onclick = (event) => {
                event.stopPropagation();
                buildingMode = 'barracks';
                console.log('Building Barracks mode activated.');
            };
            document.getElementById('build-farm').onclick = (event) => {
                event.stopPropagation();
                buildingMode = 'farm';
                console.log('Building Farm mode activated.');
            };
        } else if (unit instanceof Swordsman) {
            infoPanelElement.innerHTML = `
                <div>⚔️ Swordsman</div>
                <div>❤️: ${unit.hitpoints}</div>
                <div>⚔️: ${unit.attack}</div>
                <div>🛡️: ${unit.defense}</div>
            `;
        } else if (unit.userData.type === 'barracks') {
            infoPanelElement.innerHTML = `
                <div>Building: Barracks</div>
                <div><button id="create-swordsman">Create Swordsman (60 Gold, 20 Wood)</button></div>
                <div><button id="research-swordsman-attack">Research Swordsman Attack (100 Gold, 50 Stone)</button></div>
            `;
            document.getElementById('create-swordsman').onclick = () => unit.createSwordsman();
            document.getElementById('research-swordsman-attack').onclick = researchSwordsmanAttack;
        } else if (unit === townCenter) {
            infoPanelElement.innerHTML = `
                <div>Building: Town Center</div>
                <div>❤️: ${townCenter.hitpoints}</div>
            `;
        }
    } else if (selectedUnits.length > 1) {
        infoPanelElement.innerHTML = `<div>${selectedUnits.length} units selected</div>`;
    } else {
        infoPanelElement.innerHTML = '';
    }
    // Display current age and advance age button
    infoPanelElement.innerHTML += `
        <div>Current Age: ${town.currentAge}</div>
        <div><button id="advance-age">Advance Age</button></div>
    `;
    document.getElementById('advance-age').onclick = advanceAge;

    // Update resource displays
    woodDisplayElement.textContent = `🪵: ${town.wood}`;
    goldDisplayElement.textContent = `💰: ${town.gold}`;
    stoneDisplayElement.textContent = `🪨: ${town.stone}`;
    foodDisplayElement.textContent = `🥩: ${town.food}`;
}

function animate() {
    requestAnimationFrame(animate);

    if (borderPanCheckbox.checked) {
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
    }

    updateUnits();
    updateUI();

    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}

function updateUnits() {
    const deltaTime = 0.016; // Assume 60 FPS

    units.forEach(unit => {
        if (unit instanceof Villager) {
            unit.update(deltaTime, townCenter, town);
        } else if (unit instanceof Swordsman) {
            unit.update(deltaTime);
        }
    });
}