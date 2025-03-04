// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio); // Crisp on iPhones

// Lighting
const sunLight = new THREE.DirectionalLight(0xffffff, 1);
sunLight.position.set(5, 10, 5);
scene.add(sunLight);
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

// Day/Night Sky with Psychedelic Twist
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
            vec3 dayColor = vec3(0.5, 0.7, 1.0); // Blue sky
            vec3 nightColor = vec3(0.1, 0.1, 0.3); // Dark with stars
            vec3 color = mix(dayColor, nightColor, t);
            float stars = fract(sin(dot(vNormal.xy, vec2(12.9898, 78.233))) * 43758.5453) > 0.99 ? 1.0 : 0.0;
            gl_FragColor = vec4(color + stars * (1.0 - t), 1.0); // Twinkling stars at night
        }
    `,
    side: THREE.BackSide
});
const sky = new THREE.Mesh(skyGeometry, skyMaterial);
scene.add(sky);

// Realistic Ocean with Reflections
const oceanGeometry = new THREE.PlaneGeometry(1000, 1000, 128, 128);
const oceanMaterial = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0x1e90ff) },
        lightPos: { value: sunLight.position }
    },
    vertexShader: `
        uniform float time;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
            vUv = uv;
            vec3 pos = position;
            pos.z += sin(pos.x * 0.1 + time) * 2.0 + cos(pos.y * 0.1 + time) * 2.0;
            vNormal = normalize(vec3(sin(pos.x * 0.1 + time), cos(pos.y * 0.1 + time), 1.0));
            vPosition = pos;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 color;
        uniform vec3 lightPos;
        uniform float time;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
            vec3 lightDir = normalize(lightPos - vPosition);
            float diff = max(dot(vNormal, lightDir), 0.0);
            vec3 reflectColor = vec3(0.5, 0.7, 1.0) * diff * 0.5; // Sky reflection
            gl_FragColor = vec4(color * (0.5 + 0.5 * sin(vUv.y * 10.0)) + reflectColor, 1.0);
        }
    `,
    side: THREE.DoubleSide
});
const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
ocean.rotation.x = -Math.PI / 2;
scene.add(ocean);

// Mind-Blowing Pirate Ship
const ship = new THREE.Group();
const hullGeometry = new THREE.BoxGeometry(1, 0.5, 3);
const hullMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513, specular: 0x555555, shininess: 50 });
const hull = new THREE.Mesh(hullGeometry, hullMaterial);
ship.add(hull);
const mastGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2);
const mast = new THREE.Mesh(mastGeometry, hullMaterial);
mast.position.y = 1.25;
ship.add(mast);
const sailGeometry = new THREE.PlaneGeometry(1, 1.5);
const sailMaterial = new THREE.MeshPhongMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide, emissive: 0x00ff00, emissiveIntensity: 0.1 });
const sail = new THREE.Mesh(sailGeometry, sailMaterial);
sail.position.set(0, 0.75, 0);
sail.rotation.y = Math.PI / 2;
mast.add(sail);
// Psychedelic Glow Rings
const glowGeometry = new THREE.TorusGeometry(0.5, 0.1, 16, 100);
const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.8 });
for (let i = 0; i < 3; i++) {
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(0, 0.5 + i * 0.3, 0);
    ship.add(glow);
}
ship.position.y = 2;
scene.add(ship);

// Camera and Controls
let cameraDistance = 10, cameraAngleX = 0, cameraAngleY = Math.PI / 4;
let shipSpeed = 0, shipStrafe = 0, shipTurn = 0;

// Laptop Controls
document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'ArrowUp': shipSpeed = 0.1; break;
        case 'ArrowDown': shipSpeed = -0.1; break;
        case 'ArrowLeft': shipStrafe = -0.1; break;
        case 'ArrowRight': shipStrafe = 0.1; break;
        case 'w': cameraAngleY = Math.min(cameraAngleY + 0.05, Math.PI / 2); break;
        case 's': cameraAngleY = Math.max(cameraAngleY - 0.05, -Math.PI / 4); break;
        case 'a': cameraAngleX += 0.05; break;
        case 'd': cameraAngleX -= 0.05; break;
    }
});
document.addEventListener('keyup', (event) => {
    if (['ArrowUp', 'ArrowDown'].includes(event.key)) shipSpeed = 0;
    if (['ArrowLeft', 'ArrowRight'].includes(event.key)) shipStrafe = 0;
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
// Right Joystick: Boat Movement
rightJoystick.on('move', (evt, data) => {
    shipSpeed = data.vector.y * 0.1;
    shipStrafe = data.vector.x * 0.1;
});
rightJoystick.on('end', () => { shipSpeed = 0; shipStrafe = 0; });
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
    time += 0.03; // Slower for smoothness

    // Sky and Light
    skyMaterial.uniforms.time.value = time;
    let t = Math.sin(time * 0.05) * 0.5 + 0.5;
    sunLight.intensity = 1 - t;
    ambientLight.intensity = 0.2 + t * 0.2;

    // Ocean and Ship Motion
    oceanMaterial.uniforms.time.value = time;
    let waveHeight = Math.sin(ship.position.x * 0.1 + time) * 2 + Math.cos(ship.position.z * 0.1 + time) * 2;
    ship.position.y = 2 + waveHeight * 0.1;
    ship.rotation.z = shipStrafe * 0.2 + Math.sin(time) * 0.05; // Smooth tilt
    ship.rotation.x = shipSpeed * 0.1; // Pitch with speed

    // Ship Movement
    shipTurn = -shipStrafe * 0.5;
    ship.position.z -= shipSpeed * Math.cos(ship.rotation.y) - shipStrafe * Math.sin(ship.rotation.y);
    ship.position.x -= shipSpeed * Math.sin(ship.rotation.y) + shipStrafe * Math.cos(ship.rotation.y);
    ship.rotation.y += shipTurn * 0.05; // Smoother turning

    // Psychedelic Rings Animation
    ship.children.forEach((child, i) => {
        if (i > 2) child.scale.setScalar(1 + Math.sin(time + i) * 0.2);
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
