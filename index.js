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
        this.zoomLevel = 2.5;

        this.init();
    }

    async init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);
        this.camera.position.z = this.zoomLevel;

        // Smart texture loading with progressive quality
        const textureLoader = new THREE.TextureLoader();
        const [colorMap, normalMap, specularMap] = await Promise.all([
            textureLoader.loadAsync('https://threejs.org/examples/textures/planets/earth_atmos_4096.jpg'),
            textureLoader.loadAsync('https://threejs.org/examples/textures/planets/earth_normal_4096.jpg'),
            textureLoader.loadAsync('https://threejs.org/examples/textures/planets/earth_specular_4096.jpg')
        ]);

        // Optimized 4K material setup
        const geometry = new THREE.SphereGeometry(1, 128, 128);
        const material = new THREE.MeshPhongMaterial({
            map: colorMap,
            bumpMap: normalMap,
            bumpScale: 0.1,
            specularMap: specularMap,
            specular: new THREE.Color(0x00ff88),
            shininess: 15,
            emissive: 0x002200,
            emissiveIntensity: 0.3
        });

        this.earth = new THREE.Mesh(geometry, material);
        this.scene.add(this.earth);

        // Performance-friendly atmosphere
        const atmosphere = new THREE.Mesh(
            new THREE.SphereGeometry(1.02, 64, 64),
            new THREE.MeshBasicMaterial({
                color: 0x00ff88,
                transparent: true,
                opacity: 0.12,
                depthWrite: false
            })
        );
        this.scene.add(atmosphere);

        // Lightweight starfield (keep this simple)
        const stars = new THREE.BufferGeometry();
        const starPositions = new Float32Array(5000 * 3);
        for(let i = 0; i < 5000 * 3; i++) {
            starPositions[i] = (Math.random() - 0.5) * 2000;
        }
        stars.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        this.scene.add(new THREE.Points(stars, new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 0.5
        })));

        // Basic tile grid (keep sparse)
        const tile = new THREE.Mesh(
            new THREE.PlaneGeometry(0.15, 0.15),
            new THREE.MeshBasicMaterial({
                color: 0x00ff88,
                transparent: true,
                opacity: 0.1
            })
        );
        
        for(let lat = -80; lat <= 80; lat += 8) {
            for(let lon = -180; lon <= 180; lon += 8) {
                const tileClone = tile.clone();
                this.positionOnSphere(tileClone, lat, lon, 1.01);
                this.earth.add(tileClone);
            }
        }

        // Controls setup
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
        this.zoomLevel = THREE.MathUtils.clamp(this.zoomLevel * factor, 1, 5);
        this.camera.position.z = this.zoomLevel;
    }

    zoomToTiles() {
        this.zoomLevel = 1.5;
        this.camera.position.z = 1.5;
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        if(this.autoRotate) this.earth.rotation.y += 0.0005 * this.rotationSpeed;
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    toggleRotation() {
        this.autoRotate = !this.autoRotate;
        document.getElementById('toggleRotation').textContent = 
            this.autoRotate ? '⏸ PAUSE SIMULATION' : '▶ RESUME SIMULATION';
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

window.addEventListener('load', () => new Earth2Vision());