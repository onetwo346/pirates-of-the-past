// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// Lighting
const sunLight = new THREE.DirectionalLight(0xffffff, 1);
sunLight.position.set(5, 10, 5);
scene.add(sunLight);
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

// Day/Night Sky (simple gradient for now, can add skybox later)
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
            float t = sin(time * 0.1) * 0.5 + 0.5; // Day-night cycle
            vec3 dayColor = vec3(0.5, 0.7, 1.0); // Blue sky
            vec3 nightColor = vec3(0.1, 0.1, 0.3); // Dark starry night
            vec3 color = mix(dayColor, nightColor, t);
            gl_FragColor = vec4(color * (vNormal.y * 0.5 + 0.5), 1.0);
        }
    `,
    side: THREE.BackSide
});
const sky = new THREE.Mesh(skyGeometry, skyMaterial);
scene.add(sky);

// Animated Ocean
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

// Pirate Ship (more detailed)
const ship = new THREE.Group();
const hullGeometry = new THREE.BoxGeometry(1, 0.5, 3); // Longer hull
const hullMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513, specular: 0x555555, shininess: 30 });
const hull = new THREE.Mesh(hullGeometry, hullMaterial);
ship.add(hull);
// Mast and Sail
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
// Crazy Glow (mind-blowing touch)
const glowGeometry = new THREE.TorusGeometry(0.5, 0.1, 16, 100);
const glowMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.7 });
const glow = new THREE.Mesh(glowGeometry, glowMaterial);
glow.position.y = 0.5;
ship.add(glow);
ship.position.y = 2;
scene.add(ship);

// Camera and Controls
let cameraDistance = 10, cameraAngleX = 0, cameraAngleY = Math.PI / 4;
let shipSpeed = 0, shipStrafe = 0, shipTurn = 0;

// Laptop Controls (Arrows + Mouse)
document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp') shipSpeed = 0.1;
    if (event.key === 'ArrowDown') shipSpeed = -0.1;
    if (event.key === 'ArrowLeft') shipStrafe = -0.1;
    if (event.key === 'ArrowRight') shipStrafe = 0.1;
});
document.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') shipSpeed = 0;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') shipStrafe = 0;
});
let mouseDown = false;
document.addEventListener('mousedown', () => { mouseDown = true; });
document.addEventListener('mouseup', () => { mouseDown = false; });
document.addEventListener('mousemove', (event) => {
    if (mouseDown) {
        cameraAngleX += event.movementX * 0.005;
        cameraAngleY = Math.max(Math.min(cameraAngleY - event.movementY * 0.005, Math.PI / 2), -Math.PI / 4);
    }
});

// iPhone Joysticks
const leftJoystick = nipplejs.create({
    zone: document.getElementById('joystickLeft'),
    mode: 'static',
    position: { left: '50%', top: '50%' },
    color: 'grey'
});
const rightJoystick = nipplejs.create({
    zone: document.getElementById('joystickRight'),
    mode: 'static',
    position: { left: '50%', top: '50%' },
    color: 'grey'
});
leftJoystick.on('move', (evt, data) => {
    shipSpeed = data.vector.y * 0.1;
    shipStrafe = data.vector.x * 0.1;
});
leftJoystick.on('end', () => { shipSpeed = 0; shipStrafe = 0; });
rightJoystick.on('move', (evt, data) => {
    cameraAngleX += data.vector.x * 0.05;
    cameraAngleY = Math.max(Math.min(cameraAngleY + data.vector.y * 0.05, Math.PI / 2), -Math.PI / 4);
});
rightJoystick.on('end', () => {});

// Animation Loop
let time = 0;
function animate() {
    requestAnimationFrame(animate);
    time += 0.05;

    // Update sky and light
    skyMaterial.uniforms.time.value = time;
    let t = Math.sin(time * 0.05) * 0.5 + 0.5;
    sunLight.intensity = 1 - t;
    ambientLight.intensity = 0.2 + t * 0.2;

    // Update ocean
    oceanMaterial.uniforms.time.value = time;
    let waveHeight = Math.sin(ship.position.x * 0.1 + time) * 2 + Math.cos(ship.position.z * 0.1 + time) * 2;
    ship.position.y = 2 + waveHeight * 0.1;
    ship.rotation.z = Math.sin(time) * 0.05; // Gentle rocking

    // Ship movement
    shipTurn = -shipStrafe * 0.5; // Strafe turns the ship
    ship.position.z -= shipSpeed * Math.cos(ship.rotation.y) - shipStrafe * Math.sin(ship.rotation.y);
    ship.position.x -= shipSpeed * Math.sin(ship.rotation.y) + shipStrafe * Math.cos(ship.rotation.y);
    ship.rotation.y += shipTurn;

    // Camera (full 3D control)
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
