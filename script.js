// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// Lighting (for realism)
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 5);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040));

// Animated Ocean with Shader
const oceanGeometry = new THREE.PlaneGeometry(1000, 1000, 100, 100);
const oceanShader = {
    uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0x1e90ff) }
    },
    vertexShader: `
        uniform float time;
        varying vec2 vUv;
        void main() {
            vUv = uv;
            vec3 pos = position;
            pos.z += sin(pos.x * 0.1 + time) * 2.0 + cos(pos.y * 0.1 + time) * 2.0; // Wave effect
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 color;
        varying vec2 vUv;
        void main() {
            gl_FragColor = vec4(color * (0.5 + 0.5 * sin(vUv.y * 10.0)), 1.0); // Shimmering gradient
        }
    `
};
const oceanMaterial = new THREE.ShaderMaterial({
    uniforms: oceanShader.uniforms,
    vertexShader: oceanShader.vertexShader,
    fragmentShader: oceanShader.fragmentShader,
    side: THREE.DoubleSide
});
const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
ocean.rotation.x = -Math.PI / 2;
scene.add(ocean);

// Crazy Out-of-This-World Ship
const ship = new THREE.Group(); // Group for multiple parts
const hullGeometry = new THREE.CylinderGeometry(0.5, 1, 3, 32); // Base hull
const hullMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513, emissive: 0xff00ff, emissiveIntensity: 0.3 }); // Glowing pink edges
const hull = new THREE.Mesh(hullGeometry, hullMaterial);
hull.rotation.z = Math.PI / 2;
ship.add(hull);

// Floating Runes (crazy design)
const runeGeometry = new THREE.TorusGeometry(0.3, 0.1, 16, 100);
const runeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });
for (let i = 0; i < 4; i++) {
    const rune = new THREE.Mesh(runeGeometry, runeMaterial);
    rune.position.set(Math.sin(i) * 1.5, 0.5 + i * 0.3, Math.cos(i) * 1.5);
    ship.add(rune);
}
ship.position.y = 2; // Above waves
scene.add(ship);

// Camera setup
camera.position.set(0, 5, 10);
camera.lookAt(ship.position);

// Movement controls
let shipSpeed = 0, shipTurn = 0, cameraAngle = 0;

// Arrow keys (laptop)
document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp') shipSpeed = 0.1;
    if (event.key === 'ArrowDown') shipSpeed = -0.1;
    if (event.key === 'ArrowLeft') shipTurn = 0.05;
    if (event.key === 'ArrowRight') shipTurn = -0.05;
});
document.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') shipSpeed = 0;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') shipTurn = 0;
});

// Joysticks (iPhone)
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
leftJoystick.on('move', (evt, data) => { shipSpeed = data.vector.y * 0.1; });
leftJoystick.on('end', () => { shipSpeed = 0; });
rightJoystick.on('move', (evt, data) => { cameraAngle = data.vector.x * 0.05; });
rightJoystick.on('end', () => { cameraAngle = 0; });

// Animation loop
let time = 0;
function animate() {
    requestAnimationFrame(animate);

    // Update ocean waves
    time += 0.05;
    oceanShader.uniforms.time.value = time;

    // Ship movement
    ship.position.z -= shipSpeed * Math.cos(ship.rotation.y);
    ship.position.x -= shipSpeed * Math.sin(ship.rotation.y);
    ship.rotation.y += shipTurn;

    // Floating runes animation
    ship.children.forEach((child, i) => {
        if (i > 0) child.position.y = 0.5 + i * 0.3 + Math.sin(time + i) * 0.2;
    });

    // Camera follows ship
    camera.position.set(
        ship.position.x + 10 * Math.sin(ship.rotation.y + cameraAngle),
        5,
        ship.position.z + 10 * Math.cos(ship.rotation.y + cameraAngle)
    );
    camera.lookAt(ship.position);

    renderer.render(scene, camera);
}
animate();

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
