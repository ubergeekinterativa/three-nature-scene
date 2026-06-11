// ==================== SCENE SETUP ====================
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowShadowMap;
document.body.appendChild(renderer.domElement);

camera.position.set(0, 40, 60);
camera.lookAt(0, 0, 0);

// ==================== GLOBAL SETTINGS ====================
const settings = {
    dayTime: 12,
    sunIntensity: 0.8,
    ambientIntensity: 0.6,
    treeDensity: 15,
    flowerCount: 40,
    terrainHeight: 50,
    windSpeed: 1,
    particleDensity: 1,
    showWater: true,
    showFog: true,
    enableAnimation: true,
    terrainSize: 300,
    waterLevel: 5
};

const sceneState = {
    elements: [],
    particles: null,
    terrain: null,
    water: null,
    time: 0
};

// ==================== LIGHTING SYSTEM ====================
const sunLight = new THREE.DirectionalLight(0xffffff, settings.sunIntensity);
sunLight.position.set(100, 80, 50);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.far = 500;
sunLight.shadow.camera.left = -300;
sunLight.shadow.camera.right = 300;
sunLight.shadow.camera.top = 300;
sunLight.shadow.camera.bottom = -300;
sunLight.shadow.bias = -0.0001;
scene.add(sunLight);

const ambientLight = new THREE.AmbientLight(0xffffff, settings.ambientIntensity);
scene.add(ambientLight);

const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x2d5016, 0.3);
scene.add(hemisphereLight);

// Sky with gradient
const skyGeometry = new THREE.SphereGeometry(400, 32, 32);
const skyMaterial = new THREE.ShaderMaterial({
    uniforms: {
        dayTime: { value: settings.dayTime }
    },
    vertexShader: `
        varying vec3 vPosition;
        void main() {
            vPosition = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float dayTime;
        varying vec3 vPosition;
        void main() {
            float t = dayTime / 24.0;
            vec3 dayColor = vec3(0.53, 0.81, 0.92);
            vec3 sunsetColor = vec3(1.0, 0.6, 0.2);
            vec3 nightColor = vec3(0.02, 0.02, 0.1);
            
            vec3 finalColor;
            if (t < 0.25) {
                finalColor = mix(nightColor, dayColor, t * 4.0);
            } else if (t < 0.5) {
                finalColor = dayColor;
            } else if (t < 0.75) {
                finalColor = mix(dayColor, sunsetColor, (t - 0.5) * 2.0);
                finalColor = mix(finalColor, nightColor, (t - 0.5) * 2.0);
            } else {
                finalColor = nightColor;
            }
            
            float verticalGradient = (vPosition.y + 1.0) * 0.5;
            finalColor = mix(finalColor * 0.7, finalColor, verticalGradient);
            
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `,
    side: THREE.BackSide
});
const sky = new THREE.Mesh(skyGeometry, skyMaterial);
scene.add(sky);

// ==================== TERRAIN GENERATION ====================
function generateTerrain() {
    if (sceneState.terrain) {
        scene.remove(sceneState.terrain);
    }

    const width = settings.terrainSize;
    const height = settings.terrainSize;
    const widthSegments = 100;
    const heightSegments = 100;

    const geometry = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);
    geometry.rotateX(-Math.PI / 2);

    const positionAttribute = geometry.getAttribute('position');
    const positionArray = positionAttribute.array;

    for (let i = 0; i < positionArray.length; i += 3) {
        const x = positionArray[i];
        const z = positionArray[i + 2];

        let height = 0;
        let amplitude = settings.terrainHeight;
        let frequency = 0.01;
        let maxValue = 0;

        for (let j = 0; j < 4; j++) {
            height += amplitude * Math.sin(x * frequency) * Math.cos(z * frequency);
            maxValue += amplitude;
            amplitude *= 0.5;
            frequency *= 2;
        }

        positionArray[i + 1] = height / 2;
    }

    geometry.computeVertexNormals();
    positionAttribute.needsUpdate = true;

    const material = new THREE.MeshStandardMaterial({
        color: 0x1a4d1a,
        roughness: 0.8,
        metalness: 0,
        map: createTerrainTexture()
    });

    const terrain = new THREE.Mesh(geometry, material);
    terrain.castShadow = true;
    terrain.receiveShadow = true;
    scene.add(terrain);
    sceneState.terrain = terrain;
}

function createTerrainTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    for (let i = 0; i < 256; i++) {
        for (let j = 0; j < 256; j++) {
            const noise = Math.random();
            const brightness = 100 + noise * 50;
            ctx.fillStyle = `hsl(120, 50%, ${brightness / 2.55}%)`;
            ctx.fillRect(i, j, 1, 1);
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
}

// ==================== WATER SYSTEM ====================
function createWater() {
    if (sceneState.water) {
        scene.remove(sceneState.water);
    }

    const waterGeometry = new THREE.PlaneGeometry(settings.terrainSize * 2, settings.terrainSize * 2, 64, 64);
    waterGeometry.rotateX(-Math.PI / 2);

    const waterMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            waveAmplitude: { value: 0.5 },
            waveFrequency: { value: 2.0 }
        },
        vertexShader: `
            uniform float time;
            uniform float waveAmplitude;
            uniform float waveFrequency;

            void main() {
                vec3 pos = position;
                pos.y += sin(pos.x * waveFrequency + time) * waveAmplitude;
                pos.y += cos(pos.z * waveFrequency + time * 0.7) * waveAmplitude * 0.7;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
        fragmentShader: `
            void main() {
                vec3 waterColor = vec3(0.2, 0.6, 0.8);
                gl_FragColor = vec4(waterColor, 0.6);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide
    });

    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.position.y = settings.waterLevel;
    water.castShadow = true;
    water.receiveShadow = true;
    scene.add(water);
    sceneState.water = water;
}

// ==================== FOG SYSTEM ====================
function updateFog() {
    if (settings.showFog) {
        scene.fog = new THREE.Fog(0x87CEEB, 300, 500);
    } else {
        scene.fog = null;
    }
}

// ==================== PARTICLE SYSTEM ====================
function createParticleSystem() {
    if (sceneState.particles) {
        scene.remove(sceneState.particles);
    }

    const particleCount = Math.floor(1000 * settings.particleDensity);
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * settings.terrainSize;
        positions[i * 3 + 1] = Math.random() * 200;
        positions[i * 3 + 2] = (Math.random() - 0.5) * settings.terrainSize;

        velocities[i * 3] = (Math.random() - 0.5) * settings.windSpeed;
        velocities[i * 3 + 1] = -Math.random() * 0.5;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * settings.windSpeed;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.userData.velocities = velocities;

    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.5,
        transparent: true,
        opacity: 0.5
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    sceneState.particles = particles;
}

// ==================== PROCEDURAL L-SYSTEM TREE ====================
class LSystemTree {
    constructor(x, z, iterations = 5, angle = 25) {
        this.x = x;
        this.z = z;
        this.iterations = iterations;
        this.angle = angle * Math.PI / 180;
        this.group = new THREE.Group();
        this.branches = [];
        this.generate();
    }

    generate() {
        const axiom = 'X';
        const rules = {
            X: 'F-[[X]+X]+F[+FX]-X',
            F: 'FF'
        };

        let current = axiom;
        for (let i = 0; i < this.iterations; i++) {
            let next = '';
            for (let char of current) {
                next += rules[char] || char;
            }
            current = next;
        }

        this.interpret(current);
        this.group.position.set(this.x, 0, this.z);
    }

    interpret(instructions) {
        let stack = [];
        let position = new THREE.Vector3(0, 0, 0);
        let direction = new THREE.Vector3(0, 1, 0);
        let length = 3;
        const angleIncrement = this.angle;

        for (let char of instructions) {
            switch (char) {
                case 'F':
                    this.drawSegment(position.clone(), direction.clone(), length);
                    position.addScaledVector(direction, length);
                    length *= 0.75;
                    break;

                case '+':
                    direction.applyAxisAngle(new THREE.Vector3(0, 0, 1), angleIncrement);
                    break;

                case '-':
                    direction.applyAxisAngle(new THREE.Vector3(0, 0, 1), -angleIncrement);
                    break;

                case '[':
                    stack.push({
                        pos: position.clone(),
                        dir: direction.clone(),
                        len: length
                    });
                    break;

                case ']':
                    if (stack.length > 0) {
                        const state = stack.pop();
                        position = state.pos;
                        direction = state.dir;
                        length = state.len;
                    }
                    break;
            }
        }
    }

    drawSegment(start, direction, length) {
        const end = start.clone().addScaledVector(direction, length);
        const mid = start.clone().lerp(end, 0.5);

        const radius = Math.max(0.15, length * 0.2);
        const geometry = new THREE.CylinderGeometry(radius * 0.6, radius, length, 12);
        const material = new THREE.MeshStandardMaterial({
            color: 0x654321,
            roughness: 0.8,
            metalness: 0
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(mid);
        mesh.lookAt(end);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        this.group.add(mesh);

        if (length < 1.5) {
            const foliage = this.createTropicalFoliage(end, length);
            this.group.add(foliage);
        }
    }

    createTropicalFoliage(position, size) {
        const foliageGroup = new THREE.Group();

        for (let i = 0; i < 5; i++) {
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * size * 3,
                Math.random() * size * 1.5,
                (Math.random() - 0.5) * size * 3
            );

            const sphereGeometry = new THREE.SphereGeometry(size * 1.2, 8, 8);
            const leafMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.35 + Math.random() * 0.05, 0.8, 0.35 + Math.random() * 0.15),
                roughness: 0.6,
                metalness: 0
            });

            const foliageMesh = new THREE.Mesh(sphereGeometry, leafMaterial);
            foliageMesh.position.copy(position).add(offset);
            foliageMesh.castShadow = true;
            foliageMesh.receiveShadow = true;

            foliageGroup.add(foliageMesh);
        }

        return foliageGroup;
    }

    getMesh() {
        return this.group;
    }
}

// ==================== TROPICAL FLOWERS ====================
function createTropicalFlower(x, y, z, petalColor = 0xff69b4, size = 1) {
    const flowerGroup = new THREE.Group();

    const stemGeometry = new THREE.CylinderGeometry(0.08, 0.08, 2.5, 8);
    const stemMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a6b1a,
        roughness: 0.7,
        metalness: 0
    });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.y = 1.25;
    stem.castShadow = true;
    flowerGroup.add(stem);

    const petalCount = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < petalCount; i++) {
        const angle = (i / petalCount) * Math.PI * 2;
        
        const petalGeometry = new THREE.ConeGeometry(size * 0.25, size * 0.8, 8);
        const petalMaterial = new THREE.MeshStandardMaterial({
            color: petalColor,
            roughness: 0.5,
            metalness: 0
        });

        const petal = new THREE.Mesh(petalGeometry, petalMaterial);
        petal.position.set(
            Math.cos(angle) * size * 0.6,
            2.2 + size * 0.4,
            Math.sin(angle) * size * 0.6
        );
        petal.rotation.z = angle + Math.PI / 2;
        petal.castShadow = true;
        flowerGroup.add(petal);
    }

    const centerGeometry = new THREE.SphereGeometry(size * 0.35, 10, 10);
    const centerMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        roughness: 0.4,
        metalness: 0.2
    });
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    center.position.y = 2.5 + size * 0.5;
    center.castShadow = true;
    flowerGroup.add(center);

    for (let i = 0; i < 2; i++) {
        const leafGeometry = new THREE.BoxGeometry(0.3, 1.2, 0.08);
        const leafMaterial = new THREE.MeshStandardMaterial({
            color: 0x228b22,
            roughness: 0.6,
            metalness: 0
        });

        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        leaf.position.set(
            (i - 0.5) * 0.5,
            1,
            0
        );
        leaf.rotation.z = (i - 0.5) * 0.3;
        leaf.castShadow = true;
        flowerGroup.add(leaf);
    }

    flowerGroup.position.set(x, y, z);
    return flowerGroup;
}

// ==================== DENSE TROPICAL PLANTS ====================
function createDenseTropicalPlant(x, y, z) {
    const plantGroup = new THREE.Group();

    const leafCount = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < leafCount; i++) {
        const angle = (i / leafCount) * Math.PI * 2;
        const height = Math.sin(i / leafCount * Math.PI) * 1.5;

        const leafGeometry = new THREE.BoxGeometry(0.4, 1.8, 0.12);
        const leafMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(0.35, 0.75, 0.3 + Math.random() * 0.25),
            roughness: 0.5,
            metalness: 0,
            side: THREE.DoubleSide
        });

        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        leaf.position.set(
            Math.cos(angle) * 0.6,
            height + 0.9,
            Math.sin(angle) * 0.6
        );
        leaf.rotation.z = angle + Math.PI / 4;
        leaf.rotation.x = Math.random() * 0.4 - 0.2;
        leaf.castShadow = true;
        plantGroup.add(leaf);
    }

    const soilGeometry = new THREE.CylinderGeometry(0.45, 0.5, 0.3, 8);
    const soilMaterial = new THREE.MeshStandardMaterial({
        color: 0x5c3d1f,
        roughness: 0.8,
        metalness: 0
    });
    const soil = new THREE.Mesh(soilGeometry, soilMaterial);
    soil.position.y = 0.15;
    soil.castShadow = true;
    plantGroup.add(soil);

    plantGroup.position.set(x, y, z);
    return plantGroup;
}

// ==================== DENSE GRASS SYSTEM ====================
function createDenseGrass() {
    const grassGroup = new THREE.Group();
    const grassCount = Math.floor(3000 * (settings.treeDensity / 15));

    for (let i = 0; i < grassCount; i++) {
        const x = (Math.random() - 0.5) * settings.terrainSize * 0.9;
        const z = (Math.random() - 0.5) * settings.terrainSize * 0.9;

        const bladeGroup = new THREE.Group();
        const bladeCount = 4;

        for (let j = 0; j < bladeCount; j++) {
            const angle = (j / bladeCount) * Math.PI * 2;
            const bladeGeometry = new THREE.BoxGeometry(0.06, 0.35, 0.02);
            const bladeMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.35, 0.7, 0.35 + Math.random() * 0.12),
                roughness: 0.7,
                metalness: 0,
                side: THREE.DoubleSide
            });

            const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
            blade.position.set(
                Math.cos(angle) * 0.08,
                0.175,
                Math.sin(angle) * 0.08
            );
            blade.rotation.z = angle;
            blade.castShadow = true;

            bladeGroup.add(blade);
        }

        bladeGroup.position.set(x, 0, z);
        grassGroup.add(bladeGroup);
    }

    return grassGroup;
}

// ==================== SCENE GENERATION ====================
function generateScene() {
    sceneState.elements.forEach(el => {
        if (el.parent) {
            el.parent.remove(el);
        }
    });
    sceneState.elements = [];

    generateTerrain();
    if (settings.showWater) createWater();
    createParticleSystem();

    for (let i = 0; i < settings.treeDensity; i++) {
        const angle = (i / settings.treeDensity) * Math.PI * 2;
        const distance = 30 + Math.random() * 80;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        const iterations = 4 + Math.floor(Math.random() * 2);
        const angleVar = 20 + Math.random() * 15;

        const tree = new LSystemTree(x, z, iterations, angleVar);
        scene.add(tree.getMesh());
        sceneState.elements.push(tree.getMesh());
    }

    const flowerColors = [0xff69b4, 0xff1493, 0xffa500, 0xff6347, 0xda70d6, 0x00ced1, 0xff00ff, 0x00ff7f];
    for (let i = 0; i < settings.flowerCount; i++) {
        const x = (Math.random() - 0.5) * settings.terrainSize * 0.8;
        const z = (Math.random() - 0.5) * settings.terrainSize * 0.8;
        const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
        const size = 0.6 + Math.random() * 0.7;
        const flower = createTropicalFlower(x, 0.1, z, color, size);
        scene.add(flower);
        sceneState.elements.push(flower);
    }

    for (let i = 0; i < Math.floor(settings.flowerCount * 0.75); i++) {
        const x = (Math.random() - 0.5) * settings.terrainSize * 0.8;
        const z = (Math.random() - 0.5) * settings.terrainSize * 0.8;
        const plant = createDenseTropicalPlant(x, 0, z);
        scene.add(plant);
        sceneState.elements.push(plant);
    }

    const grass = createDenseGrass();
    scene.add(grass);
    sceneState.elements.push(grass);
}

generateScene();

// ==================== DAY NIGHT CYCLE ====================
function updateDayNightCycle() {
    const time = settings.dayTime;
    const timeNormalized = time / 24;

    skyMaterial.uniforms.dayTime.value = settings.dayTime;

    const sunAngle = timeNormalized * Math.PI * 2 - Math.PI / 2;
    const sunHeight = Math.sin(sunAngle) * 80 + 20;
    const sunDistance = Math.cos(sunAngle) * 100;

    sunLight.position.set(sunDistance, sunHeight, 50);
    sunLight.target.position.set(0, 0, 0);

    let intensity = settings.sunIntensity;
    if (time < 6 || time > 18) {
        intensity *= 0.3;
    } else if (time < 8 || time > 16) {
        intensity *= 0.7;
    }
    sunLight.intensity = intensity;

    ambientLight.intensity = settings.ambientIntensity;

    if (scene.fog) {
        scene.fog.far = 300 + Math.sin(timeNormalized * Math.PI) * 100;
    }
}

// ==================== MOUSE CONTROLS ====================
let isRotating = false;
let previousMousePosition = { x: 0, y: 0 };

document.addEventListener('mousedown', (e) => {
    isRotating = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
});

document.addEventListener('mousemove', (e) => {
    if (isRotating) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        const targetRotationX = deltaY * 0.005;
        const targetRotationY = deltaX * 0.005;

        camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), targetRotationY);
        const rightVector = new THREE.Vector3().crossVectors(camera.position, new THREE.Vector3(0, 1, 0)).normalize();
        camera.position.applyAxisAngle(rightVector, targetRotationX);
        camera.lookAt(0, 15, 0);

        previousMousePosition = { x: e.clientX, y: e.clientY };
    }
});

document.addEventListener('mouseup', () => {
    isRotating = false;
});

document.addEventListener('wheel', (e) => {
    e.preventDefault();
    const direction = camera.position.clone().normalize();
    const distance = camera.position.length();
    const newDistance = Math.max(20, Math.min(300, distance + e.deltaY * 0.1));
    camera.position.copy(direction.multiplyScalar(newDistance));
    camera.lookAt(0, 15, 0);
});

// ==================== CONTROL PANEL ====================
function toggleControlPanel() {
    const panel = document.getElementById('controlPanel');
    panel.classList.toggle('active');
}

function applyPreset(preset) {
    switch (preset) {
        case 'dawn':
            settings.dayTime = 6;
            break;
        case 'day':
            settings.dayTime = 12;
            break;
        case 'dusk':
            settings.dayTime = 18;
            break;
        case 'night':
            settings.dayTime = 22;
            break;
    }
    updateControlPanelValues();
}

function updateControlPanelValues() {
    document.getElementById('dayTimeSlider').value = settings.dayTime;
    document.getElementById('timeValue').textContent = formatTime(settings.dayTime);
    document.getElementById('timeDisplay').textContent = `Time: ${formatTime(settings.dayTime)}`;
    document.getElementById('sunIntensity').value = settings.sunIntensity;
    document.getElementById('sunValue').textContent = settings.sunIntensity.toFixed(1);
    document.getElementById('ambientLight').value = settings.ambientIntensity;
    document.getElementById('ambientValue').textContent = settings.ambientIntensity.toFixed(1);
    document.getElementById('treeDensity').value = settings.treeDensity;
    document.getElementById('densityValue').textContent = settings.treeDensity;
    document.getElementById('flowerCount').value = settings.flowerCount;
    document.getElementById('flowerValue').textContent = settings.flowerCount;
    document.getElementById('terrainHeight').value = settings.terrainHeight;
    document.getElementById('terrainValue').textContent = settings.terrainHeight;
    document.getElementById('windSpeed').value = settings.windSpeed;
    document.getElementById('windValue').textContent = settings.windSpeed.toFixed(1);
    document.getElementById('particleDensity').value = settings.particleDensity;
    document.getElementById('particleValue').textContent = settings.particleDensity.toFixed(1);
}

function formatTime(hours) {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

document.getElementById('dayTimeSlider').addEventListener('input', (e) => {
    settings.dayTime = parseFloat(e.target.value);
    document.getElementById('timeValue').textContent = formatTime(settings.dayTime);
    document.getElementById('timeDisplay').textContent = `Time: ${formatTime(settings.dayTime)}`;
});

document.getElementById('sunIntensity').addEventListener('input', (e) => {
    settings.sunIntensity = parseFloat(e.target.value);
    document.getElementById('sunValue').textContent = settings.sunIntensity.toFixed(1);
});

document.getElementById('ambientLight').addEventListener('input', (e) => {
    settings.ambientIntensity = parseFloat(e.target.value);
    document.getElementById('ambientValue').textContent = settings.ambientIntensity.toFixed(1);
});

document.getElementById('treeDensity').addEventListener('input', (e) => {
    settings.treeDensity = parseInt(e.target.value);
    document.getElementById('densityValue').textContent = settings.treeDensity;
    regenerateScene();
});

document.getElementById('flowerCount').addEventListener('input', (e) => {
    settings.flowerCount = parseInt(e.target.value);
    document.getElementById('flowerValue').textContent = settings.flowerCount;
    regenerateScene();
});

document.getElementById('terrainHeight').addEventListener('input', (e) => {
    settings.terrainHeight = parseInt(e.target.value);
    document.getElementById('terrainValue').textContent = settings.terrainHeight;
    generateTerrain();
});

document.getElementById('windSpeed').addEventListener('input', (e) => {
    settings.windSpeed = parseFloat(e.target.value);
    document.getElementById('windValue').textContent = settings.windSpeed.toFixed(1);
    createParticleSystem();
});

document.getElementById('particleDensity').addEventListener('input', (e) => {
    settings.particleDensity = parseFloat(e.target.value);
    document.getElementById('particleValue').textContent = settings.particleDensity.toFixed(1);
    createParticleSystem();
});

document.getElementById('showWater').addEventListener('change', (e) => {
    settings.showWater = e.target.checked;
    if (settings.showWater) createWater();
    else if (sceneState.water) scene.remove(sceneState.water);
});

document.getElementById('showFog').addEventListener('change', (e) => {
    settings.showFog = e.target.checked;
    updateFog();
});

document.getElementById('enableAnimation').addEventListener('change', (e) => {
    settings.enableAnimation = e.target.checked;
});

document.getElementById('shadowQuality').addEventListener('change', (e) => {
    const quality = e.target.value;
    switch (quality) {
        case 'low':
            sunLight.shadow.mapSize.width = 512;
            sunLight.shadow.mapSize.height = 512;
            break;
        case 'medium':
            sunLight.shadow.mapSize.width = 2048;
            sunLight.shadow.mapSize.height = 2048;
            break;
        case 'high':
            sunLight.shadow.mapSize.width = 4096;
            sunLight.shadow.mapSize.height = 4096;
            break;
    }
});

document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyH') {
        toggleControlPanel();
    }
    if (e.code === 'KeyR') {
        regenerateScene();
    }
});

function regenerateScene() {
    generateScene();
}

window.regenerateScene = regenerateScene;
window.toggleControlPanel = toggleControlPanel;
window.applyPreset = applyPreset;

updateControlPanelValues();
updateFog();

// ==================== ANIMATION LOOP ====================
let time = 0;

function animate() {
    requestAnimationFrame(animate);

    sceneState.time += 0.016;
    time += 0.016;

    if (settings.enableAnimation) {
        updateDayNightCycle();

        if (sceneState.particles) {
            const positionAttribute = sceneState.particles.geometry.getAttribute('position');
            const positions = positionAttribute.array;
            const velocities = sceneState.particles.geometry.userData.velocities;

            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += velocities[i];
                positions[i + 1] += velocities[i + 1];
                positions[i + 2] += velocities[i + 2];

                if (positions[i] > settings.terrainSize / 2) positions[i] = -settings.terrainSize / 2;
                if (positions[i] < -settings.terrainSize / 2) positions[i] = settings.terrainSize / 2;
                if (positions[i + 1] < 0) positions[i + 1] = 200;
                if (positions[i + 2] > settings.terrainSize / 2) positions[i + 2] = -settings.terrainSize / 2;
                if (positions[i + 2] < -settings.terrainSize / 2) positions[i + 2] = settings.terrainSize / 2;
            }
            positionAttribute.needsUpdate = true;
        }

        if (sceneState.water && sceneState.water.material.uniforms) {
            sceneState.water.material.uniforms.time.value = time;
        }

        sceneState.elements.forEach((element, index) => {
            if (element.children) {
                element.children.forEach(child => {
                    if (child.geometry && child.position) {
                        const windInfluence = Math.sin(time * settings.windSpeed * 0.5 + index) * 0.002;
                        child.position.x += windInfluence;
                        child.rotation.z += Math.sin(time * 0.3 + index * 0.1) * 0.0005;
                    }
                });
            }
        });
    }

    const statsDiv = document.getElementById('stats');
    if (statsDiv) {
        const meshCount = scene.children.reduce((count, obj) => {
            return count + (obj.isMesh ? 1 : obj.children ? obj.children.length : 0);
        }, 0);

        statsDiv.innerHTML = `
            <div>🎮 FPS: ${Math.round(1000 / 16)}</div>
            <div>📦 Objects: ${sceneState.elements.length}</div>
            <div>🎬 Meshes: ${meshCount}</div>
            <div>📍 Camera:</div>
            <div style="margin-left: 10px;">
                X: ${camera.position.x.toFixed(1)}<br>
                Y: ${camera.position.y.toFixed(1)}<br>
                Z: ${camera.position.z.toFixed(1)}
            </div>
            <div>🕐 Time: ${formatTime(settings.dayTime)}</div>
            <div>☀️ Sun: ${settings.sunIntensity.toFixed(1)}</div>
        `;
    }

    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});