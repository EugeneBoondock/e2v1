import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class Earth2Vision {
    constructor() {
        this.container = document.querySelector('#canvasContainer');
        this.loadingScreen = document.querySelector('.loading');
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.controls = null;
        this.earth = null;
        this.autoRotate = true;
        this.rotationSpeed = 1;
        this.zoomLevel = 2.5;

        this.init();
    }

    async init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.container.appendChild(this.renderer.domElement);

        this.camera.position.z = this.zoomLevel;

        // Simplified lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(5, 3, 5);
        this.scene.add(directionalLight);

        // Medium resolution textures (2K instead of 8K)
        const textureLoader = new THREE.TextureLoader();
        const [texture, bumpMap] = await Promise.all([
            textureLoader.loadAsync('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg'),
            textureLoader.loadAsync('https://threejs.org/examples/textures/planets/earth_normal_2048.jpg')
        ]);

        // Reduced geometry complexity
        const geometry = new THREE.SphereGeometry(1, 64, 64);
        const material = new THREE.MeshPhongMaterial({
            map: texture,
            bumpMap: bumpMap,
            bumpScale: 0.05,
            specular: new THREE.Color(0x00ff88),
            shininess: 10,
            emissive: 0x003300,
            emissiveIntensity: 0.2
        });

        this.earth = new THREE.Mesh(geometry, material);
        this.scene.add(this.earth);

        // Simplified atmosphere
        const atmosphere = new THREE.Mesh(
            new THREE.SphereGeometry(1.02, 32, 32),
            new THREE.MeshBasicMaterial({
                color: 0x00ff88,
                transparent: true,
                opacity: 0.1
            })
        );
        this.scene.add(atmosphere);

        // Optimized star field
        const starsGeometry = new THREE.BufferGeometry();
        const starsVertices = new Float32Array(3000 * 3);
        for(let i = 0; i < 3000 * 3; i += 3) {
            starsVertices[i] = (Math.random() - 0.5) * 2000;
            starsVertices[i+1] = (Math.random() - 0.5) * 2000;
            starsVertices[i+2] = (Math.random() - 0.5) * 2000;
        }
        starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsVertices, 3));
        const starField = new THREE.Points(
            starsGeometry,
            new THREE.PointsMaterial({color: 0xFFFFFF, size: 0.5})
        );
        this.scene.add(starField);

        // Basic tile grid (reduced density)
        const tileGeometry = new THREE.PlaneGeometry(0.2, 0.2);
        const tileMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.1
        });

        for(let lat = -80; lat <= 80; lat += 10) {
            for(let lon = -180; lon <= 180; lon += 10) {
                const tile = new THREE.Mesh(tileGeometry, tileMaterial);
                this.positionOnSphere(tile, lat, lon, 1.01);
                this.earth.add(tile);
            }
        }

        // Initialize controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Event listeners
        window.addEventListener('resize', this.onWindowResize.bind(this));
        document.getElementById('toggleRotation').addEventListener('click', this.toggleRotation.bind(this));
        document.getElementById('resetView').addEventListener('click', this.resetView.bind(this));
        document.getElementById('speed').addEventListener('input', (e) => {
            this.rotationSpeed = parseFloat(e.target.value);
        });
        document.getElementById('zoomIn').addEventListener('click', () => this.adjustZoom(0.8));
        document.getElementById('zoomOut').addEventListener('click', () => this.adjustZoom(1.2));
        document.getElementById('zoomTiles').addEventListener('click', () => this.zoomToTiles());

        // Hide loading screen
        this.loadingScreen.style.display = 'none';
        this.animate();
    }

    positionOnSphere(obj, lat, lon, radius) {
        const phi = (90 - lat) * Math.PI / 180;
        const theta = (lon + 180) * Math.PI / 180;
        
        obj.position.set(
            -radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.cos(phi),
            radius * Math.sin(phi) * Math.sin(theta)
        );
        
        obj.lookAt(0, 0, 0);
        obj.rotateX(Math.PI/2);
    }

    adjustZoom(factor) {
        this.zoomLevel *= factor;
        this.camera.position.z = THREE.MathUtils.clamp(this.zoomLevel, 1, 5);
    }

    zoomToTiles() {
        this.zoomLevel = 1.5;
        this.camera.position.z = 1.5;
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        if(this.autoRotate) {
            this.earth.rotation.y += 0.0005 * this.rotationSpeed;
        }
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    toggleRotation() {
        this.autoRotate = !this.autoRotate;
        const btn = document.getElementById('toggleRotation');
        btn.textContent = this.autoRotate ? '⏸ PAUSE SIMULATION' : '▶ RESUME SIMULATION';
    }

    resetView() {
        this.camera.position.set(0, 0, 2.5);
        this.earth.rotation.set(0, 0, 0);
        this.controls.update();
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

window.addEventListener('load', () => {
    new Earth2Vision();
});