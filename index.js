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
            alpha: true,
            powerPreference: "high-performance"
        });
        this.controls = null;
        this.earth = null;
        this.autoRotate = true;
        this.rotationSpeed = 1;
        this.isDragging = false;
        this.tiles = [];
        this.flags = [];
        this.zoomLevel = 2.5;

        this.init();
    }

    async init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        this.camera.position.z = this.zoomLevel;

        // Lighting setup
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        directionalLight.position.set(5, 3, 5);
        this.scene.add(directionalLight);

        // Load high-resolution textures
        const textureLoader = new THREE.TextureLoader();
        const [texture, bumpMap, specularMap] = await Promise.all([
            textureLoader.loadAsync('https://raw.githubusercontent.com/celestiaproject/celestia/master/media/textures/earth/earth.jpg'),
            textureLoader.loadAsync('https://raw.githubusercontent.com/celestiaproject/celestia/master/media/textures/earth/earth_normal.jpg'),
            textureLoader.loadAsync('https://raw.githubusercontent.com/celestiaproject/celestia/master/media/textures/earth/earth_specular.jpg')
        ]);

        // Earth mesh with high-quality materials
        const geometry = new THREE.SphereGeometry(1, 256, 256);
        const material = new THREE.MeshPhongMaterial({
            map: texture,
            bumpMap: bumpMap,
            bumpScale: 0.15,
            specularMap: specularMap,
            specular: new THREE.Color(0x00ff88),
            shininess: 25,
            emissive: 0x003300,
            emissiveIntensity: 0.5,
            reflectivity: 0.3
        });

        this.earth = new THREE.Mesh(geometry, material);
        this.scene.add(this.earth);

        // Atmosphere effect
        const atmosphere = new THREE.Mesh(
            new THREE.SphereGeometry(1.05, 128, 128),
            new THREE.MeshPhysicalMaterial({
                color: 0x00ff88,
                transparent: true,
                opacity: 0.15,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            })
        );
        this.scene.add(atmosphere);

        // Starfield background
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 0.7,
            transparent: true,
            opacity: 0.8
        });

        const starsVertices = [];
        for (let i = 0; i < 10000; i++) {
            starsVertices.push(
                THREE.MathUtils.randFloatSpread(2000),
                THREE.MathUtils.randFloatSpread(2000),
                THREE.MathUtils.randFloatSpread(2000)
            );
        }
        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        const starField = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(starField);

        // Tile grid system
        const tileGeometry = new THREE.PlaneGeometry(0.1, 0.1);
        const tileMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.1,
            depthWrite: false
        });

        for (let lat = -85; lat <= 85; lat += 5) {
            for (let lon = -180; lon <= 180; lon += 5) {
                const tile = new THREE.Mesh(tileGeometry, tileMaterial);
                this.positionOnSphere(tile, lat, lon, 1.01);
                this.earth.add(tile);
                this.tiles.push(tile);
            }
        }

        // Country flags
        this.addFlags([
            { country: 'US', lat: 37.09, lon: -95.71 },
            { country: 'GB', lat: 55.38, lon: -3.44 },
            { country: 'NZ', lat: -40.90, lon: 174.89 },
            { country: 'KR', lat: 35.91, lon: 127.77 },
            { country: 'IT', lat: 41.87, lon: 12.56 }
        ]);

        // Camera controls
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

        // Start animation
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
        obj.rotateX(Math.PI / 2);
    }

    addFlags(flagData) {
        flagData.forEach(flag => {
            const marker = document.createElement('div');
            marker.className = 'flag-marker';
            marker.style.display = 'none';
            document.body.appendChild(marker);

            const updatePosition = () => {
                const vector = this.latLonToVector(flag.lat, flag.lon, 1.02);
                const screenPos = vector.project(this.camera);
                marker.style.left = `${(screenPos.x * 0.5 + 0.5) * window.innerWidth}px`;
                marker.style.top = `${(-screenPos.y * 0.5 + 0.5) * window.innerHeight}px`;
                marker.style.display = screenPos.z > 1 ? 'none' : 'block';
            };

            this.flags.push({ marker, updatePosition });
        });
    }

    latLonToVector(lat, lon, radius) {
        const phi = (90 - lat) * Math.PI / 180;
        const theta = (lon + 180) * Math.PI / 180;

        return new THREE.Vector3(
            -radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.cos(phi),
            radius * Math.sin(phi) * Math.sin(theta)
        );
    }

    adjustZoom(factor) {
        this.zoomLevel *= factor;
        this.camera.position.z = THREE.MathUtils.clamp(this.zoomLevel, 1, 5);
        this.tiles.forEach(tile => {
            tile.material.opacity = THREE.MathUtils.mapLinear(
                this.camera.position.z,
                1, 5,
                0.3, 0.1
            );
        });
    }

    zoomToTiles() {
        this.zoomLevel = 1.5;
        this.camera.position.z = 1.5;
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        if (this.autoRotate && !this.isDragging) {
            this.earth.rotation.y += 0.0005 * this.rotationSpeed;
        }

        this.controls.update();
        this.flags.forEach(flag => flag.updatePosition());
        this.renderer.render(this.scene, this.camera);
    }

    toggleRotation() {
        this.autoRotate = !this.autoRotate;
        const btn = document.getElementById('toggleRotation');
        btn.textContent = this.autoRotate ? '⏸ PAUSE SIMULATION' : '▶ RESUME SIMULATION';
        btn.style.color = this.autoRotate ? '#00ff88' : '#ff0066';
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