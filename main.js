import * as THREE from 'three';

// ------------------------------------------------------------
// SCENE SETUP
// ------------------------------------------------------------
const canvasContainer = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0B0C10); // Strict deep space black
scene.fog = new THREE.FogExp2(0x0B0C10, 0.03); // Softer cinematic fog

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2, 8); // Start camera position

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
canvasContainer.appendChild(renderer.domElement);

// ------------------------------------------------------------
// UTILITIES: Create Circular Particle Texture
// ------------------------------------------------------------
function createCircleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // Draw soft circle
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Add soft glow edge
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffffff';

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}
const circleTexture = createCircleTexture();

// ------------------------------------------------------------
// MOUNTAIN LANDSCAPE (Wireframe / Standard material)
// ------------------------------------------------------------
const planeGeometry = new THREE.PlaneGeometry(80, 80, 64, 64);
const basePositions = new Float32Array(planeGeometry.attributes.position.array); // Store original Grid X,Y

const mountainMaterial = new THREE.MeshStandardMaterial({
    color: 0x1A1D21, // Matte graphite
    wireframe: true, // Tech/architectural cinematic feel
    roughness: 0.6,
    metalness: 0.5
});

const mountain = new THREE.Mesh(planeGeometry, mountainMaterial);
mountain.rotation.x = -Math.PI / 2; // Lay flat
mountain.position.y = -3;
scene.add(mountain);

// ------------------------------------------------------------
// STAR FIELD & DATA EMBERS
// ------------------------------------------------------------

// Stars
const starsGeometry = new THREE.BufferGeometry();
const starsCount = 1500;
const posArray = new Float32Array(starsCount * 3);

for (let i = 0; i < starsCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 150;
}
starsGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

const starsMaterial = new THREE.PointsMaterial({
    size: 0.15,
    color: 0xC5C6C7, // Soft silver
    transparent: true,
    opacity: 0.8,
    map: circleTexture,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});
const starsMesh = new THREE.Points(starsGeometry, starsMaterial);
starsMesh.position.y = 10;
scene.add(starsMesh);

// Data Embers (Replacing static clouds with rising energy)
const emberGeometry = new THREE.BufferGeometry();
const emberCount = 300;
const emberPosArray = new Float32Array(emberCount * 3);
const emberVelocities = new Float32Array(emberCount); // Unique upward speeds

for (let i = 0; i < emberCount * 3; i += 3) {
    emberPosArray[i] = (Math.random() - 0.5) * 40; // x
    emberPosArray[i + 1] = (Math.random() * 10) - 2; // y (height)
    emberPosArray[i + 2] = (Math.random() - 0.5) * 40 - 10; // z (depth)
    emberVelocities[i / 3] = Math.random() * 0.02 + 0.01;
}
emberGeometry.setAttribute('position', new THREE.BufferAttribute(emberPosArray, 3));

const emberMaterial = new THREE.PointsMaterial({
    size: 0.3,
    color: 0x4DE8D4, // Cyber Teal Primary (Faded 30%)
    transparent: true,
    opacity: 0.6,
    map: circleTexture,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});
const emberMesh = new THREE.Points(emberGeometry, emberMaterial);
scene.add(emberMesh);

// ------------------------------------------------------------
// LIGHTING
// ------------------------------------------------------------
// Ambient very dim light
const ambientLight = new THREE.AmbientLight(0x0B0C10, 2);
scene.add(ambientLight);

// Distant light source on mountain peak (symbolizing ambition)
const peakLight = new THREE.PointLight(0x3BBDAE, 50, 100); // Cyber Teal Hover color (Faded)
peakLight.position.set(0, 10, -30);
scene.add(peakLight);

// Interactive Mouse Cursor Light (Tracks terrain)
const cursorLight = new THREE.PointLight(0x4DE8D4, 20, 20); // Cyber Teal Primary (Faded)
scene.add(cursorLight);

// ------------------------------------------------------------
// ANIMATION & CAMERA CONTROLS
// ------------------------------------------------------------
const clock = new THREE.Clock();

// Mouse tracking for interactive parallax
let mouseX = 0;
let mouseY = 0;
let targetX = 0;
let targetY = 0;

const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX - windowHalfX) * 0.003;
    mouseY = (event.clientY - windowHalfY) * 0.003;
});

function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    // 1. INFINITE TERRAIN SCROLLING (Classic Synthwave effect)
    // We offset the Y coordinate sample (which is depth Z globally) continuously
    const speed = elapsedTime * 2;
    const positions = planeGeometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        const x = basePositions[i];
        const y = basePositions[i + 1] - speed; // Shift sampling backwards over time

        // Generate height using sine waves based on shifted coordinate
        let height = (Math.sin(x * 0.3) + Math.cos(y * 0.3)) * 1.5;
        height += (Math.sin(x * 1.2) + Math.cos(y * 1.2)) * 0.4;

        // Ensure center-back creates a massive peak regardless of scroll
        const globalY = basePositions[i + 1]; // Absolute position on plane grid
        if (globalY > 10) {
            // The further back, the higher it goes
            height += (globalY - 10) * 0.6;
        }

        positions[i + 2] = height;
    }
    planeGeometry.attributes.position.needsUpdate = true;
    planeGeometry.computeVertexNormals(); // Recompute lighting based on real-time waves

    // 2. INTERACTIVE CURSOR LIGHT & PARALLAX
    targetX = mouseX * 3;
    targetY = -mouseY * 3;

    // Smooth camera drift
    camera.position.x += (targetX + Math.sin(elapsedTime * 0.2) * 1.0 - camera.position.x) * 0.03;
    camera.position.y += (targetY + 2 + Math.cos(elapsedTime * 0.1) * 0.5 - camera.position.y) * 0.03;
    camera.lookAt(0, 3, -15); // Look slightly upward at the peaks

    // Map cursor light smoothly near the ground
    cursorLight.position.x += (targetX * 5 - cursorLight.position.x) * 0.05;
    cursorLight.position.z += (-targetY * 5 - 5 - cursorLight.position.z) * 0.05;
    cursorLight.position.y = -2; // Keep it low over the mountains

    // 3. DATA EMBERS (Rising particles)
    const emberPositions = emberGeometry.attributes.position.array;
    for (let i = 1; i < emberPositions.length; i += 3) { // Y values
        emberPositions[i] += emberVelocities[(i - 1) / 3]; // Unique upward velocity

        // Add subtle lateral sway
        emberPositions[i - 1] += Math.sin(elapsedTime + i) * 0.01;

        if (emberPositions[i] > 10) {
            emberPositions[i] = -2; // Reset to ground
            emberPositions[i - 1] = (Math.random() - 0.5) * 40; // Random X
        }
    }
    emberGeometry.attributes.position.needsUpdate = true;

    // 4. STARS CONTINUOUS WARP
    starsMesh.rotation.z = elapsedTime * 0.02; // Very slow majestic tilt
    const starPositions = starsGeometry.attributes.position.array;
    for (let i = 2; i < starPositions.length; i += 3) {
        starPositions[i] += 0.1; // Stars move forward continuously
        if (starPositions[i] > 10) {
            starPositions[i] = -120; // Reset deep distance
            starPositions[i - 2] = (Math.random() - 0.5) * 150; // Random X
            starPositions[i - 1] = (Math.random() - 0.5) * 150; // Random Y
        }
    }
    starsGeometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
}

// Handle resizing
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

// Parallax scrolling for HTML content
let scrollY = window.scrollY;
window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
    // Lower camera slightly based on scroll distance for native page feel
    camera.position.z = 8 - (scrollY * 0.005);
});

animate();

// ------------------------------------------------------------
// DOM MICRO-INTERACTIONS
// ------------------------------------------------------------

// 1. Scroll Fade Up (Intersection Observer)
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
};

const fadeObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target); // Only animate once
        }
    });
}, observerOptions);

document.querySelectorAll('.fade-up').forEach(element => {
    fadeObserver.observe(element);
});

// 2. Typing Effect (Hero Subtitles)
const typingText = document.getElementById('typing-text');
const roles = [
    "Cybersecurity Engineer",
    "Network Architect",
    "CEH v13 Certified",
    "System Secure."
];
let roleIndex = 0;
let charIndex = 0;
let isDeleting = false;
let typingDelay = 100;

function typeSequence() {
    const currentRole = roles[roleIndex];

    if (isDeleting) {
        typingText.textContent = currentRole.substring(0, charIndex - 1);
        charIndex--;
        typingDelay = 50; // Delete faster
    } else {
        typingText.textContent = currentRole.substring(0, charIndex + 1);
        charIndex++;
        typingDelay = 100;
    }

    if (!isDeleting && charIndex === currentRole.length) {
        // Pause at end of word
        typingDelay = 2000;
        // Start deleting to loop back
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        // Move to the next string, looping back to 0 if at the end
        roleIndex = (roleIndex + 1) % roles.length;
        typingDelay = 500;
    }

    // Use a trailing cursor effect in CSS by adding a span or pipe, but textContent handles the string
    typingText.innerHTML = typingText.textContent + '<span class="cursor" style="color: var(--accent); animation: blink 1s step-end infinite;">|</span>';

    setTimeout(typeSequence, typingDelay);
}

// Start typing sequence after initial load delay
setTimeout(typeSequence, 1000);

// Add simple cursor blink keyframe to document dynamically if not in CSS
if (!document.getElementById('cursor-style')) {
    const style = document.createElement('style');
    style.id = 'cursor-style';
    style.innerHTML = `@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`;
    document.head.appendChild(style);
}
