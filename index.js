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
        this.isMapView = false;
        this.mapPlane = null;
        this.labelContainer = document.createElement('div');

        this.init();
    }

    async init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);
        this.camera.position.z = this.zoomLevel;

        // Simplified Globe Material (Green color, no textures)
        const earthMaterial = new THREE.MeshBasicMaterial({
            color: 0x3498db, // Blue color for oceans, can be changed
            wireframe: false // Set to true for wireframe globe
        });

        // Create earth sphere
        const geometry = new THREE.SphereGeometry(1, 64, 64); // Reduced segments for simpler look if needed
        this.earth = new THREE.Mesh(geometry, earthMaterial);
        this.scene.add(this.earth);

        // Atmosphere (optional, keep it simple or remove)
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

        // Starfield background (optional, can simplify further if needed)
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

        // Tile grid (keep if you like, or remove for even simpler style)
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

        // Simplified Map Plane Material (Solid color)
        this.mapPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(4, 2, 100, 50),
            new THREE.MeshBasicMaterial({
                color: 0x7f8c8d, // Gray color for map, can be changed
                transparent: true,
                opacity: 0.9,
                wireframe: false // Set to true for wireframe map
            })
        );
        this.mapPlane.visible = false;
        this.scene.add(this.mapPlane);

        // Setup label container
        this.labelContainer.style.position = 'fixed';
        this.labelContainer.style.pointerEvents = 'none';
        document.body.appendChild(this.labelContainer);

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
        document.getElementById('toggleMap').addEventListener('click', () => this.toggleMapView());

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

    adjustZoom(factor) {
        this.zoomLevel = THREE.MathUtils.clamp(this.zoomLevel * factor, 1, 5);
        this.camera.position.z = this.zoomLevel;
        if(this.isMapView) this.updateLabels();
    }

    zoomToTiles() {
        this.zoomLevel = 1.5;
        this.camera.position.z = 1.5;
        if(this.isMapView) this.updateLabels();
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        if(this.autoRotate && !this.isMapView) this.earth.rotation.y += 0.0005 * this.rotationSpeed;
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
        if(this.isMapView) this.updateLabels();
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        if(this.isMapView) this.updateLabels();
    }

    toggleMapView() {
        this.isMapView = !this.isMapView;
        this.earth.visible = !this.isMapView;
        this.mapPlane.visible = this.isMapView;

        document.getElementById('toggleMap').textContent =
            this.isMapView ? '🌍 SHOW GLOBE VIEW' : '🗺 SHOW MAP VIEW';

        if(this.isMapView) {
            this.switchToMapMode();
        } else {
            this.switchToGlobeMode();
        }
    }

    switchToMapMode() {
        this.camera.position.set(0, 0, 3);
        this.camera.lookAt(0, 0, 0);
        this.controls.enableRotate = false;
        this.autoRotate = false;
        this.updateLabels();
    }

    switchToGlobeMode() {
        this.camera.position.set(0, 0, 2.5);
        this.controls.enableRotate = true;
        this.clearLabels();
    }

    updateLabels() {
        this.clearLabels();

        const countries = [
            { name: "AmeriZone", lat: 45, lon: -100 },
            { name: "EuropaSec", lat: 50, lon: 10 },
            { name: "AsiaForge", lat: 35, lon: 100 },
            { name: "AfriCore", lat: -8, lon: 20 },
            { name: "OceaniaHub", lat: -30, lon: 150 }
        ];

        countries.forEach(country => {
            const label = document.createElement('div');
            label.className = 'map-label';
            label.textContent = country.name;
            label.style.color = '#00ff88';
            label.style.position = 'absolute';

            const vector = new THREE.Vector3(
                (country.lon / 180) * 2,
                -(country.lat / 90),
                0
            );

            vector.project(this.camera);
            const x = (vector.x * .5 + 0.5) * window.innerWidth;
            const y = (vector.y * -.5 + 0.5) * window.innerHeight;

            label.style.left = `${x}px`;
            label.style.top = `${y}px`;
            this.labelContainer.appendChild(label);
        });
    }

    clearLabels() {
        while(this.labelContainer.firstChild) {
            this.labelContainer.removeChild(this.labelContainer.firstChild);
        }
    }
}

window.addEventListener('load', () => new Earth2Vision());