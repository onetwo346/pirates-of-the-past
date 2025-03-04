// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas') });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Ocean
const oceanGeometry = new THREE.PlaneGeometry(1000, 1000);
const oceanMaterial = new THREE.MeshBasicMaterial({ color: 0x1e90ff });
const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
ocean.rotation.x = -Math.PI / 2;
scene.add(ocean);

// Ship
const shipGeometry = new THREE.BoxGeometry(1, 1, 2);
const shipMaterial = new THREE.MeshBasicMaterial({ color: 0x8b4513 });
const ship = new THREE.Mesh(shipGeometry, shipMaterial);
ship.position.y = 0.5;
scene.add(ship);

// Camera setup
camera.position.set(0, 5, 10);
camera.lookAt(ship.position);

// Movement variables
let shipSpeed = 0;
let shipTurn = 0;
let cameraAngle = 0;

// Laptop controls (Arrow keys)
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

// iPhone joysticks
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

// Left joystick (ship movement)
leftJoystick.on('move', (evt, data) => {
    shipSpeed = (data.vector.y * 0.1); // Forward/backward
});
leftJoystick.on('end', () => {
    shipSpeed = 0;
});

// Right joystick (camera adjustment)
rightJoystick.on('move', (evt, data) => {
    cameraAngle = data.vector.x * 0.05; // Left/right camera tilt
});
rightJoystick.on('end', () => {
    cameraAngle = 0;
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Ship movement
    ship.position.z -= shipSpeed * Math.cos(ship.rotation.y);
    ship.position.x -= shipSpeed * Math.sin(ship.rotation.y);
    ship.rotation.y += shipTurn;

    // Camera follows ship with adjustable angle
    camera.position.set(
        ship.position.x + 10 * Math.sin(ship.rotation.y + cameraAngle),
        5,
        ship.position.z + 10 * Math.cos(ship.rotation.y + cameraAngle)
    );
    camera.lookAt(ship.position);

    renderer.render(scene, camera);
}
animate();

// Resize handler for all devices
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
