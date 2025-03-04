// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// Lighting
const sunLight = new THREE.DirectionalLight(0xffffff, 1);
sunLight.position.set(5, 10, 5);
scene.add(sunLight);
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

// Sky
const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
const skyMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `
        varying vec3 vNormal;
        void main() {
            vNormal = normal;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float time;
        varying vec3 vNormal;
        void main() {
            float t = sin(time * 0.1) * 0.5 + 0.5;
            vec3 dayColor = vec3(0.5, 0.7, 1.0);
            vec3 nightColor = vec3(0.1, 0.1, 0.3);
            vec3 color = mix(dayColor, nightColor, t);
            float stars = fract(sin(dot(vNormal.xy, vec2(12.9898, 78.233))) * 43758.5453) > 0.99 ? 1.0 : 0.0;
            gl_FragColor = vec4(color + stars * (1.0 - t), 1.0);
        }
    `,
    side: THREE.BackSide
});
const sky = new THREE.Mesh(skyGeometry, skyMaterial);
scene.add(sky);

// Ocean
const oceanGeometry = new THREE.PlaneGeometry(1000, 1000, 100, 100);
const oceanMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, color: { value: new THREE.Color(0x1e90ff) } },
    vertexShader: `
        uniform float time;
        varying vec2 vUv;
        void main() {
            vUv = uv;
            vec3 pos = position;
            pos.z += sin(pos.x * 0.1 + time) * 2.0 + cos(pos.y * 0.1 + time) * 2.0;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 color;
        varying vec2 vUv;
        void main() {
            gl_FragColor = vec4(color * (0.5 + 0.5 * sin(vUv.y * 10.0)), 1.0);
        }
    `,
    side: THREE.DoubleSide
});
const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
ocean.rotation.x = -Math.PI / 2;
scene.add(ocean);

// Boat
const ship = new THREE.Group();
const hullGeometry = new THREE.BoxGeometry(1, 0.5, 3);
const hullMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513, specular: 0x555555, shininess: 30 });
const hull = new THREE.Mesh(hullGeometry, hullMaterial);
ship.add(hull);
const mastGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2);
const mast = new THREE.Mesh(mastGeometry, hullMaterial);
mast.position.y = 1.25;
ship.add(mast);
const sailGeometry = new THREE.PlaneGeometry(1, 1.5);
const sailMaterial = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide });
const sail = new THREE.Mesh(sailGeometry, sailMaterial);
sail.position.set(0, 0.75, 0);
sail.rotation.y = Math.PI / 2;
mast.add(sail);
ship.position.y = 2;
scene.add(ship);

// Glowing Wake Trail
const trailGeometry = new THREE.BufferGeometry();
const trailMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5 });
const trailPositions = new Float32Array(100 * 3);
trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
const trail = new THREE.Line(trailGeometry, trailMaterial);
scene.add(trail);
let trailIndex = 0;

// Dynamic Pirate Flag
const flagGeometry = new THREE.PlaneGeometry(0.5, 0.3);
const flagMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
const flag = new THREE.Mesh(flagGeometry, flagMaterial);
flag.position.set(0, 2, -0.5);
ship.add(flag);

// Ocean Mist
const mistGeometry = new THREE.PlaneGeometry(1000, 1000);
const mistMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1 });
const mist = new THREE.Mesh(mistGeometry, mistMaterial);
mist.rotation.x = -Math.PI / 2;
mist.position.y = 1;
scene.add(mist);

// NEW: Islands
const islands = [];
const islandMaterial = new THREE.MeshPhongMaterial({ color: 0x228B22 }); // Green for land
for (let i = 0; i < 5; i++) {
    const islandGeometry = new THREE.ConeGeometry(5 + Math.random() * 5, 3, 32); // Varied sizes
    const island = new THREE.Mesh(islandGeometry, islandMaterial);
    island.position.set(
        (Math.random() - 0.5) * 800, // Spread across ocean
        1.5,
        (Math.random() - 0.5) * 800
    );
    scene.add(island);
    islands.push({ mesh: island, passengers: [], destination: null });
}

// NEW: Passengers
const passengerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red stick figures
const passengerGeometry = new THREE.BoxGeometry(0.2, 0.8, 0.2);
function spawnPassenger(island) {
    const passenger = new THREE.Mesh(passengerGeometry, passengerMaterial);
    passenger.position.set(
        island.mesh.position.x + (Math.random() - 0.5) * 4,
        2,
        island.mesh.position.z + (Math.random() - 0.5) * 4
    );
    scene.add(passenger);
    island.passengers.push(passenger);
    passenger.destination = islands[Math.floor(Math.random() * islands.length)]; // Random destination
}

// Spawn initial passengers
islands.forEach(island => {
    if (Math.random() > 0.5) spawnPassenger(island);
});

// Controls
let cameraDistance = 10, cameraAngleX = 0, cameraAngleY = Math.PI / 4;
let shipSpeedX = 0, shipSpeedZ = 0, shipRotation = 0;
let onboardPassengers = [];

// Laptop Controls
document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'ArrowUp': shipSpeedZ = -0.2; break;
        case 'ArrowDown': shipSpeedZ = 0.2; break;
        case 'ArrowLeft': shipSpeedX = -0.2; break;
        case 'ArrowRight': shipSpeedX = 0.2; break;
        case 'w': cameraAngleY = Math.min(cameraAngleY + 0.05, Math.PI / 2); break;
        case 's': cameraAngleY = Math.max(cameraAngleY - 0.05, -Math.PI / 4); break;
        case 'a': cameraAngleX += 0.05; break;
        case 'd': cameraAngleX -= 0.05; break;
    }
});
document.addEventListener('keyup', (event) => {
    if (['ArrowUp', 'ArrowDown'].includes(event.key)) shipSpeedZ = 0;
    if (['ArrowLeft', 'ArrowRight'].includes(event.key)) shipSpeedX = 0;
});

// iPhone Joysticks
const leftJoystick = nipplejs.create({
    zone: document.getElementById('joystickLeft'),
    mode: 'static',
    position: { left: '50%', top: '50%' },
    color: 'grey',
    size: 150,
    threshold: 0.1
});
const rightJoystick = nipplejs.create({
    zone: document.getElementById('joystickRight'),
    mode: 'static',
    position: { left: '50%', top: '50%' },
    color: 'grey',
    size: 150,
    threshold: 0.1
});
rightJoystick.on('move', (evt, data) => {
    shipSpeedZ = -data.vector.y * 0.2;
    shipSpeedX = data.vector.x * 0.2;
    shipRotation = -data.vector.x * 0.05;
});
rightJoystick.on('end', () => {
    shipSpeedX = 0;
    shipSpeedZ = 0;
    shipRotation = 0;
});
leftJoystick.on('move', (evt, data) => {
    cameraAngleX += data.vector.x * 0.07;
    cameraAngleY = Math.max(Math.min(cameraAngleY + data.vector.y * 0.07, Math.PI / 2), -Math.PI / 4);
});
leftJoystick.on('end', () => {});

// Animation Loop
let time = 0;
function animate() {
    requestAnimationFrame(animate);
    time += 0.016;

    // Sky
    skyMaterial.uniforms.time.value = time;
    let t = Math.sin(time * 0.05) * 0.5 + 0.5;
    sunLight.intensity = 1 - t;
    ambientLight.intensity = 0.2 + t * 0.2;

    // Ocean
    oceanMaterial.uniforms.time.value = time;
    let waveHeight = Math.sin(ship.position.x * 0.1 + time) * 2 + Math.cos(ship.position.z * 0.1 + time) * 2;
    ship.position.y = 2 + waveHeight * 0.1;

    // Boat Movement
    ship.position.x += shipSpeedX;
    ship.position.z += shipSpeedZ;
    ship.rotation.y += shipRotation;
    ship.rotation.z = shipSpeedX * 0.15;
    ship.rotation.x = shipSpeedZ * 0.1;

    // Wake Trail
    if (shipSpeedX || shipSpeedZ) {
        trailPositions[trailIndex * 3] = ship.position.x;
        trailPositions[trailIndex * 3 + 1] = ship.position.y - 0.5;
        trailPositions[trailIndex * 3 + 2] = ship.position.z;
        trailIndex = (trailIndex + 1) % 100;
        trailGeometry.attributes.position.needsUpdate = true;
    }

    // Flag Wave
    flag.rotation.z = Math.sin(time * 2) * 0.2;

    // Island & Passenger Logic
    islands.forEach(island => {
        const distanceToIsland = ship.position.distanceTo(island.mesh.position);
        if (distanceToIsland < 10) { // Near island
            // Pick up passengers
            island.passengers.forEach((passenger, index) => {
                if (onboardPassengers.length < 5) { // Max 5 passengers
                    onboardPassengers.push(passenger);
                    island.passengers.splice(index, 1);
                    scene.remove(passenger);
                    passenger.position.set(0, 0.5, -1 + onboardPassengers.length * 0.4); // Line up on boat
                    ship.add(passenger);
                }
            });
            // Drop off passengers
            onboardPassengers.forEach((passenger, index) => {
                if (passenger.destination === island) {
                    onboardPassengers.splice(index, 1);
                    ship.remove(passenger);
                    passenger.position.set(
                        island.mesh.position.x + (Math.random() - 0.5) * 4,
                        2,
                        island.mesh.position.z + (Math.random() - 0.5) * 4
                    );
                    scene.add(passenger);
                }
            });
        }
        // Randomly spawn new passengers
        if (Math.random() < 0.001 && island.passengers.length < 3) spawnPassenger(island);
    });

    // Camera
    camera.position.set(
        ship.position.x + cameraDistance * Math.sin(cameraAngleX) * Math.cos(cameraAngleY),
        ship.position.y + cameraDistance * Math.sin(cameraAngleY),
        ship.position.z + cameraDistance * Math.cos(cameraAngleX) * Math.cos(cameraAngleY)
    );
    camera.lookAt(ship.position);

    renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
