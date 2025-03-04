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
scene.add(new THREE.AmbientLight(0x404040));

// Sky (keeping it simple but dynamic)
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
            gl_FragColor = vec4(color * (vNormal.y * 0.5 + 0.5), 1.0);
        }
    `,
    side: THREE.BackSide
});
const sky = new THREE.Mesh(skyGeometry, skyMaterial);
scene.add(sky);

// Ocean (dynamic but not stealing the show)
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

// Boat (unchanged design, full control focus)
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

// Camera and Controls
let cameraDistance = 10, cameraAngleX = 0, cameraAngleY = Math.PI / 4;
let shipSpeedX = 0, shipSpeedZ = 0, shipRotation = 0;

// Laptop Controls
document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'ArrowUp': shipSpeedZ = -0.15; break; // Forward
        case 'ArrowDown': shipSpeedZ = 0.15; break; // Backward
        case 'ArrowLeft': shipSpeedX = -0.15; break; // Left
        case 'ArrowRight': shipSpeedX = 0.15; break; // Right
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
    size: 150
});
const rightJoystick = nipplejs.create({
    zone: document.getElementById('joystickRight'),
    mode: 'static',
    position: { left: '50%', top: '50%' },
    color: 'grey',
    size: 150
});
// Right Joystick: Full Boat Movement
rightJoystick.on('move', (evt, data) => {
    shipSpeedZ = -data.vector.y * 0.15; // Forward/Backward
    shipSpeedX = data.vector.x * 0.15;  // Left/Right
    shipRotation = -data.vector.x * 0.03; // Smooth rotation based on strafe
});
rightJoystick.on('end', () => {
    shipSpeedX = 0;
    shipSpeedZ = 0;
    shipRotation = 0;
});
// Left Joystick: Camera Adjustment
leftJoystick.on('move', (evt, data) => {
    cameraAngleX += data.vector.x * 0.05;
    cameraAngleY = Math.max(Math.min(cameraAngleY + data.vector.y * 0.05, Math.PI / 2), -Math.PI / 4);
});
leftJoystick.on('end', () => {});

// Animation Loop
let time = 0;
function animate() {
    requestAnimationFrame(animate);
    time += 0.03;

    // Sky
    skyMaterial.uniforms.time.value = time;
    let t = Math.sin(time * 0.05) * 0.5 + 0.5;
    sunLight.intensity = 1 - t;

    // Ocean
    oceanMaterial.uniforms.time.value = time;
    let waveHeight = Math.sin(ship.position.x * 0.1 + time) * 2 + Math.cos(ship.position.z * 0.1 + time) * 2;
    ship.position.y = 2 + waveHeight * 0.1;

    // Boat Movement (Full Freedom)
    ship.position.x += shipSpeedX;
    ship.position.z += shipSpeedZ;
    ship.rotation.y += shipRotation;
    ship.rotation.z = shipSpeedX * 0.2; // Tilt with strafe
    ship.rotation.x = shipSpeedZ * 0.1; // Pitch with speed

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
