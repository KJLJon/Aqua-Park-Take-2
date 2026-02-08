// ============================================================
// AQUA PARK - Water Slide Racing Game
// Full PWA game with Three.js rendering
// ============================================================

(function() {
    'use strict';

    // ============================================================
    // CONSTANTS
    // ============================================================
    const SLIDE_WIDTH = 6;
    const SLIDE_SEGMENT_LENGTH = 2;
    const LANE_COUNT = 3;
    const GRAVITY = 0.015;
    const MAX_SPEED = 0.8;
    const BASE_SPEED = 0.25;
    const STEER_SPEED = 0.08;
    const PLAYER_RADIUS = 0.4;
    const PUSH_FORCE = 0.12;
    const TOTAL_RACERS = 4;
    const COIN_VALUE = 10;
    const ELIMINATION_BONUS = 50;

    // Character skins
    const SKINS = [
        { id: 'red', name: 'Red', color: 0xff4444, price: 0, emoji: '🔴' },
        { id: 'blue', name: 'Blue', color: 0x4488ff, price: 0, emoji: '🔵' },
        { id: 'green', name: 'Green', color: 0x44cc44, price: 0, emoji: '🟢' },
        { id: 'yellow', name: 'Yellow', color: 0xffcc00, price: 100, emoji: '🟡' },
        { id: 'purple', name: 'Purple', color: 0xaa44ff, price: 100, emoji: '🟣' },
        { id: 'orange', name: 'Orange', color: 0xff8800, price: 150, emoji: '🟠' },
        { id: 'pink', name: 'Pink', color: 0xff66aa, price: 200, emoji: '🩷' },
        { id: 'cyan', name: 'Cyan', color: 0x00cccc, price: 200, emoji: '🩵' },
        { id: 'white', name: 'Ghost', color: 0xffffff, price: 300, emoji: '⚪' },
        { id: 'black', name: 'Shadow', color: 0x333333, price: 300, emoji: '⚫' },
        { id: 'gold', name: 'Gold', color: 0xffd700, price: 500, emoji: '👑' },
        { id: 'rainbow', name: 'Rainbow', color: 0xff00ff, price: 1000, emoji: '🌈' },
    ];

    // AI opponent colors (used for non-player racers)
    const AI_COLORS = [0xffcc00, 0x44cc44, 0xff66aa, 0x00cccc, 0xaa44ff, 0xff8800];

    // Level definitions
    const LEVELS = [];
    for (let i = 1; i <= 20; i++) {
        LEVELS.push({
            id: i,
            name: `Level ${i}`,
            segments: 80 + i * 15,
            curves: Math.min(3 + Math.floor(i / 2), 12),
            obstacles: Math.min(Math.floor(i / 2), 8),
            coins: 10 + i * 2,
            powerups: Math.min(2 + Math.floor(i / 3), 6),
            aiDifficulty: Math.min(0.3 + i * 0.035, 0.95),
            ramps: Math.min(Math.floor(i / 3), 5),
            splits: i >= 5 ? Math.min(Math.floor((i - 3) / 3), 3) : 0,
        });
    }

    // ============================================================
    // SAVE DATA (LocalStorage)
    // ============================================================
    const SAVE_KEY = 'aquapark_save';

    function loadSave() {
        try {
            const data = localStorage.getItem(SAVE_KEY);
            if (data) return JSON.parse(data);
        } catch(e) { /* ignore */ }
        return {
            coins: 0,
            wins: 0,
            totalRaces: 0,
            currentLevel: 1,
            highestLevel: 1,
            levelStars: {},
            unlockedSkins: ['red', 'blue', 'green'],
            selectedSkin: 'red',
            soundOn: true,
        };
    }

    function saveSave(data) {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        } catch(e) { /* ignore */ }
    }

    let saveData = loadSave();

    // ============================================================
    // AUDIO (Web Audio API - procedural sounds)
    // ============================================================
    let audioCtx = null;

    function getAudioCtx() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioCtx;
    }

    function playSound(type) {
        if (!saveData.soundOn) return;
        try {
            const ctx = getAudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            switch(type) {
                case 'coin':
                    osc.frequency.setValueAtTime(880, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
                    gain.gain.setValueAtTime(0.15, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.15);
                    break;
                case 'splash':
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(200, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
                    gain.gain.setValueAtTime(0.2, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.3);
                    break;
                case 'bump':
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(150, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.1);
                    gain.gain.setValueAtTime(0.12, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.1);
                    break;
                case 'powerup':
                    osc.frequency.setValueAtTime(440, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
                    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.3);
                    gain.gain.setValueAtTime(0.15, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.35);
                    break;
                case 'countdown':
                    osc.frequency.setValueAtTime(600, ctx.currentTime);
                    gain.gain.setValueAtTime(0.15, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.2);
                    break;
                case 'go':
                    osc.frequency.setValueAtTime(800, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.2);
                    gain.gain.setValueAtTime(0.2, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.3);
                    break;
                case 'win':
                    [0, 0.15, 0.3, 0.45].forEach((t, i) => {
                        const o = ctx.createOscillator();
                        const g = ctx.createGain();
                        o.connect(g);
                        g.connect(ctx.destination);
                        o.frequency.setValueAtTime([523, 659, 784, 1047][i], ctx.currentTime + t);
                        g.gain.setValueAtTime(0.15, ctx.currentTime + t);
                        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
                        o.start(ctx.currentTime + t);
                        o.stop(ctx.currentTime + t + 0.2);
                    });
                    break;
                case 'eliminate':
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(400, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
                    gain.gain.setValueAtTime(0.2, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.3);
                    break;
            }
        } catch(e) { /* audio not available */ }
    }

    // ============================================================
    // SLIDE GENERATION
    // ============================================================
    function generateSlide(levelDef) {
        const path = [];
        const totalSegments = levelDef.segments;
        let x = 0, y = 30, z = 0;
        let dirX = 0, dirZ = -1;
        let curveSegments = 0;
        let curveDir = 0;
        let curvesUsed = 0;
        let nextCurve = Math.floor(totalSegments / (levelDef.curves + 1));
        let segmentCount = 0;

        for (let i = 0; i < totalSegments; i++) {
            // Determine slope - generally going down
            const slope = -0.3 - Math.random() * 0.15;

            // Handle curves
            if (curveSegments > 0) {
                const turnRate = 0.06 * curveDir;
                const newDirX = dirX * Math.cos(turnRate) - dirZ * Math.sin(turnRate);
                const newDirZ = dirX * Math.sin(turnRate) + dirZ * Math.cos(turnRate);
                dirX = newDirX;
                dirZ = newDirZ;
                curveSegments--;
            } else if (segmentCount >= nextCurve && curvesUsed < levelDef.curves) {
                curveDir = Math.random() > 0.5 ? 1 : -1;
                curveSegments = 12 + Math.floor(Math.random() * 8);
                curvesUsed++;
                nextCurve = segmentCount + Math.floor((totalSegments - segmentCount) / (levelDef.curves - curvesUsed + 1));
            }

            x += dirX * SLIDE_SEGMENT_LENGTH;
            z += dirZ * SLIDE_SEGMENT_LENGTH;
            y += slope;
            if (y < 0) y = 0;

            const width = SLIDE_WIDTH;
            path.push({ x, y, z, dirX, dirZ, width, index: i });
            segmentCount++;
        }

        // Generate items on the slide
        const coins = [];
        const obstacles = [];
        const powerups = [];
        const ramps = [];

        // Coins
        for (let i = 0; i < levelDef.coins; i++) {
            const segIdx = 10 + Math.floor(Math.random() * (totalSegments - 20));
            const seg = path[segIdx];
            const lateralOffset = (Math.random() - 0.5) * (SLIDE_WIDTH - 2);
            coins.push({
                segIndex: segIdx,
                x: seg.x + lateralOffset * (-seg.dirZ),
                y: seg.y + 0.5,
                z: seg.z + lateralOffset * seg.dirX,
                collected: false,
            });
        }

        // Obstacles
        for (let i = 0; i < levelDef.obstacles; i++) {
            const segIdx = 15 + Math.floor(Math.random() * (totalSegments - 30));
            const seg = path[segIdx];
            const lateralOffset = (Math.random() - 0.5) * (SLIDE_WIDTH - 2);
            obstacles.push({
                segIndex: segIdx,
                x: seg.x + lateralOffset * (-seg.dirZ),
                y: seg.y + 0.3,
                z: seg.z + lateralOffset * seg.dirX,
                type: Math.random() > 0.5 ? 'cone' : 'barrier',
            });
        }

        // Power-ups
        const powerupTypes = ['speed', 'shield', 'magnet', 'giant'];
        for (let i = 0; i < levelDef.powerups; i++) {
            const segIdx = 15 + Math.floor(Math.random() * (totalSegments - 25));
            const seg = path[segIdx];
            const lateralOffset = (Math.random() - 0.5) * (SLIDE_WIDTH - 3);
            powerups.push({
                segIndex: segIdx,
                x: seg.x + lateralOffset * (-seg.dirZ),
                y: seg.y + 0.7,
                z: seg.z + lateralOffset * seg.dirX,
                type: powerupTypes[Math.floor(Math.random() * powerupTypes.length)],
                collected: false,
            });
        }

        // Ramps
        for (let i = 0; i < levelDef.ramps; i++) {
            const segIdx = 20 + Math.floor(Math.random() * (totalSegments - 40));
            const seg = path[segIdx];
            ramps.push({
                segIndex: segIdx,
                x: seg.x,
                y: seg.y,
                z: seg.z,
                dirX: seg.dirX,
                dirZ: seg.dirZ,
            });
        }

        return { path, coins, obstacles, powerups, ramps };
    }

    // ============================================================
    // THREE.JS SCENE SETUP
    // ============================================================
    let scene, camera, renderer;
    let slideMeshes = [];
    let waterPlane;
    let coinMeshes = [], obstacleMeshes = [], powerupMeshes = [], rampMeshes = [];
    let racerMeshes = [];
    let splashParticles = [];
    let finishLine;

    function initThree() {
        const canvas = document.getElementById('game-canvas');

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb);
        scene.fog = new THREE.Fog(0x87ceeb, 30, 120);

        camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 200);
        camera.position.set(0, 5, 5);

        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = false;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(10, 20, 10);
        scene.add(dirLight);

        const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x0077b6, 0.4);
        scene.add(hemiLight);

        // Water plane
        const waterGeo = new THREE.PlaneGeometry(500, 500);
        const waterMat = new THREE.MeshPhongMaterial({
            color: 0x0099cc,
            transparent: true,
            opacity: 0.7,
            shininess: 100,
        });
        waterPlane = new THREE.Mesh(waterGeo, waterMat);
        waterPlane.rotation.x = -Math.PI / 2;
        waterPlane.position.y = -1;
        scene.add(waterPlane);

        window.addEventListener('resize', onResize);
    }

    function onResize() {
        if (!camera || !renderer) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function disposeMesh(m) {
        scene.remove(m);
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
            if (Array.isArray(m.material)) m.material.forEach(mt => mt.dispose());
            else m.material.dispose();
        }
        // Dispose children for groups
        if (m.children) {
            m.children.forEach(c => {
                if (c.geometry) c.geometry.dispose();
                if (c.material) c.material.dispose();
            });
        }
    }

    function clearScene() {
        slideMeshes.forEach(disposeMesh);
        slideMeshes = [];
        coinMeshes.forEach(disposeMesh);
        coinMeshes = [];
        obstacleMeshes.forEach(disposeMesh);
        obstacleMeshes = [];
        powerupMeshes.forEach(disposeMesh);
        powerupMeshes = [];
        rampMeshes.forEach(disposeMesh);
        rampMeshes = [];
        racerMeshes.forEach(disposeMesh);
        racerMeshes = [];
        splashParticles.forEach(p => scene.remove(p));
        splashParticles = [];
        if (finishLine) { disposeMesh(finishLine); finishLine = null; }
    }

    // ============================================================
    // BUILD SLIDE MESH
    // ============================================================
    function buildSlideMesh(slideData) {
        const { path } = slideData;
        const crossSteps = 6;
        const wallHeight = 1.2;

        // Batch all slide surface verts/indices into single geometries
        const slideVerts = [];
        const slideColors = [];
        const slideIndices = [];
        const wallVerts = [];
        const wallIndices = [];
        let slideVertCount = 0;
        let wallVertCount = 0;

        for (let i = 0; i < path.length - 1; i++) {
            const p0 = path[i];
            const p1 = path[i + 1];
            const halfW = p0.width / 2;
            const perpX = -p0.dirZ;
            const perpZ = p0.dirX;
            const perpX1 = -p1.dirZ;
            const perpZ1 = p1.dirX;

            // Stripe color
            const isStripe = Math.floor(i / 3) % 2 === 0;
            const cr = isStripe ? 1.0 : 0.816;
            const cg = isStripe ? 1.0 : 0.91;
            const cb = isStripe ? 1.0 : 0.94;

            const baseVert = slideVertCount;
            for (let s = 0; s <= crossSteps; s++) {
                const t = s / crossSteps;
                const angle = Math.PI * t;
                const cx = Math.cos(angle) * halfW;
                const cy = -Math.sin(angle) * 0.8;

                slideVerts.push(p0.x + perpX * cx, p0.y + cy, p0.z + perpZ * cx);
                slideVerts.push(p1.x + perpX1 * cx, p1.y + cy, p1.z + perpZ1 * cx);
                slideColors.push(cr, cg, cb, cr, cg, cb);
            }
            for (let s = 0; s < crossSteps; s++) {
                const a = baseVert + s * 2;
                const b = a + 1;
                const c = a + 2;
                const d = a + 3;
                slideIndices.push(a, b, c, b, d, c);
            }
            slideVertCount += (crossSteps + 1) * 2;

            // Walls (batched)
            for (const side of [-1, 1]) {
                const wx0 = p0.x + perpX * halfW * side;
                const wy0 = p0.y;
                const wz0 = p0.z + perpZ * halfW * side;
                const wx1 = p1.x + perpX1 * halfW * side;
                const wy1 = p1.y;
                const wz1 = p1.z + perpZ1 * halfW * side;

                const wb = wallVertCount;
                wallVerts.push(wx0, wy0, wz0, wx1, wy1, wz1, wx0, wy0 + wallHeight, wz0, wx1, wy1 + wallHeight, wz1);
                wallIndices.push(wb, wb+1, wb+2, wb+1, wb+3, wb+2);
                wallVertCount += 4;
            }
        }

        // Build single slide mesh
        const slideGeo = new THREE.BufferGeometry();
        slideGeo.setAttribute('position', new THREE.Float32BufferAttribute(slideVerts, 3));
        slideGeo.setAttribute('color', new THREE.Float32BufferAttribute(slideColors, 3));
        slideGeo.setIndex(slideIndices);
        slideGeo.computeVertexNormals();
        const slideMat = new THREE.MeshPhongMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            shininess: 80,
        });
        const slideMesh = new THREE.Mesh(slideGeo, slideMat);
        scene.add(slideMesh);
        slideMeshes.push(slideMesh);

        // Build single wall mesh
        const wallGeo = new THREE.BufferGeometry();
        wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(wallVerts, 3));
        wallGeo.setIndex(wallIndices);
        wallGeo.computeVertexNormals();
        const wallMat = new THREE.MeshPhongMaterial({
            color: 0x0099dd,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
        });
        const wallMesh = new THREE.Mesh(wallGeo, wallMat);
        scene.add(wallMesh);
        slideMeshes.push(wallMesh);

        // Add finish area (pool)
        const lastSeg = path[path.length - 1];
        const poolGeo = new THREE.CylinderGeometry(8, 8, 0.3, 32);
        const poolMat = new THREE.MeshPhongMaterial({
            color: 0x00ccee,
            transparent: true,
            opacity: 0.6,
        });
        const pool = new THREE.Mesh(poolGeo, poolMat);
        pool.position.set(lastSeg.x, lastSeg.y - 0.5, lastSeg.z - 5);
        scene.add(pool);
        slideMeshes.push(pool);

        // Finish line
        const finGeo = new THREE.BoxGeometry(SLIDE_WIDTH + 2, 3, 0.2);
        const finMat = new THREE.MeshPhongMaterial({ color: 0xff4444 });
        finishLine = new THREE.Mesh(finGeo, finMat);
        const flSeg = path[path.length - 3];
        finishLine.position.set(flSeg.x, flSeg.y + 1.5, flSeg.z);
        scene.add(finishLine);
    }

    // ============================================================
    // BUILD ITEMS
    // ============================================================
    function buildItems(slideData) {
        // Coins
        slideData.coins.forEach((coin, idx) => {
            const geo = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 16);
            const mat = new THREE.MeshPhongMaterial({ color: 0xffd700, emissive: 0x996600 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.x = Math.PI / 2;
            mesh.position.set(coin.x, coin.y, coin.z);
            mesh.userData = { type: 'coin', index: idx };
            scene.add(mesh);
            coinMeshes.push(mesh);
        });

        // Obstacles
        slideData.obstacles.forEach((obs, idx) => {
            let mesh;
            if (obs.type === 'cone') {
                const geo = new THREE.ConeGeometry(0.4, 1.0, 8);
                const mat = new THREE.MeshPhongMaterial({ color: 0xff6600 });
                mesh = new THREE.Mesh(geo, mat);
            } else {
                const geo = new THREE.BoxGeometry(2.5, 0.6, 0.3);
                const mat = new THREE.MeshPhongMaterial({ color: 0xff0000 });
                mesh = new THREE.Mesh(geo, mat);
            }
            mesh.position.set(obs.x, obs.y, obs.z);
            mesh.userData = { type: 'obstacle', index: idx };
            scene.add(mesh);
            obstacleMeshes.push(mesh);
        });

        // Power-ups
        slideData.powerups.forEach((pu, idx) => {
            const geo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
            const colors = { speed: 0x00ff00, shield: 0x4488ff, magnet: 0xff00ff, giant: 0xff8800 };
            const mat = new THREE.MeshPhongMaterial({
                color: colors[pu.type] || 0xffffff,
                emissive: (colors[pu.type] || 0xffffff),
                emissiveIntensity: 0.3,
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(pu.x, pu.y, pu.z);
            mesh.userData = { type: 'powerup', index: idx, puType: pu.type };
            scene.add(mesh);
            powerupMeshes.push(mesh);
        });

        // Ramps
        slideData.ramps.forEach((ramp, idx) => {
            const geo = new THREE.BoxGeometry(SLIDE_WIDTH - 1, 0.2, 2);
            const mat = new THREE.MeshPhongMaterial({ color: 0xffaa00 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(ramp.x, ramp.y + 0.1, ramp.z);
            // Angle the ramp upward
            mesh.rotation.x = -0.3;
            mesh.userData = { type: 'ramp', index: idx };
            scene.add(mesh);
            rampMeshes.push(mesh);
        });
    }

    // ============================================================
    // RACER
    // ============================================================
    function createRacerMesh(color) {
        const group = new THREE.Group();

        // Body (sitting position on tube)
        const bodyGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.6, 8);
        const bodyMat = new THREE.MeshPhongMaterial({ color });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.5;
        group.add(body);

        // Head
        const headGeo = new THREE.SphereGeometry(0.22, 8, 8);
        const headMat = new THREE.MeshPhongMaterial({ color: 0xffcc88 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.0;
        group.add(head);

        // Tube/float
        const tubeGeo = new THREE.TorusGeometry(0.45, 0.15, 8, 16);
        const tubeMat = new THREE.MeshPhongMaterial({ color: color, emissive: color, emissiveIntensity: 0.1 });
        const tube = new THREE.Mesh(tubeGeo, tubeMat);
        tube.rotation.x = Math.PI / 2;
        tube.position.y = 0.15;
        group.add(tube);

        // Position label
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(1.2, 0.6, 1);
        sprite.position.y = 1.6;
        group.add(sprite);
        group.userData.labelCanvas = canvas;
        group.userData.labelCtx = ctx;
        group.userData.labelTexture = texture;
        group.userData.labelSprite = sprite;

        return group;
    }

    function updateRacerLabel(group, text, color) {
        const ctx = group.userData.labelCtx;
        const canvas = group.userData.labelCanvas;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        // roundRect polyfill for older browsers
        const rx = 4, ry = 4, rw = canvas.width - 8, rh = canvas.height - 8, rad = 10;
        ctx.moveTo(rx + rad, ry);
        ctx.lineTo(rx + rw - rad, ry);
        ctx.arcTo(rx + rw, ry, rx + rw, ry + rad, rad);
        ctx.lineTo(rx + rw, ry + rh - rad);
        ctx.arcTo(rx + rw, ry + rh, rx + rw - rad, ry + rh, rad);
        ctx.lineTo(rx + rad, ry + rh);
        ctx.arcTo(rx, ry + rh, rx, ry + rh - rad, rad);
        ctx.lineTo(rx, ry + rad);
        ctx.arcTo(rx, ry, rx + rad, ry, rad);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = color || '#fff';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        group.userData.labelTexture.needsUpdate = true;
    }

    // ============================================================
    // SPLASH PARTICLES
    // ============================================================
    function createSplash(x, y, z) {
        for (let i = 0; i < 8; i++) {
            const geo = new THREE.SphereGeometry(0.08, 4, 4);
            const mat = new THREE.MeshPhongMaterial({ color: 0xaaddff, transparent: true, opacity: 0.8 });
            const p = new THREE.Mesh(geo, mat);
            p.position.set(x, y, z);
            p.userData.vel = {
                x: (Math.random() - 0.5) * 0.15,
                y: Math.random() * 0.15 + 0.05,
                z: (Math.random() - 0.5) * 0.15,
            };
            p.userData.life = 1.0;
            scene.add(p);
            splashParticles.push(p);
        }
    }

    function updateParticles(dt) {
        for (let i = splashParticles.length - 1; i >= 0; i--) {
            const p = splashParticles[i];
            p.position.x += p.userData.vel.x;
            p.position.y += p.userData.vel.y;
            p.position.z += p.userData.vel.z;
            p.userData.vel.y -= 0.008;
            p.userData.life -= 0.03;
            p.material.opacity = p.userData.life;
            if (p.userData.life <= 0) {
                scene.remove(p);
                splashParticles.splice(i, 1);
            }
        }
    }

    // ============================================================
    // GAME STATE
    // ============================================================
    let gameState = 'loading'; // loading, menu, levelSelect, customize, countdown, playing, finished, results
    let currentSlide = null;
    let currentLevel = null;
    let racers = [];
    let playerIndex = 0;
    let raceTime = 0;
    let coinsCollected = 0;
    let eliminationCount = 0;
    let animFrameId = null;
    let lastTime = 0;
    let steerInput = 0; // -1 left, 0 center, 1 right
    let touchStartX = 0;
    let isTouching = false;

    function initRacer(index, color, isPlayer) {
        const startSeg = currentSlide.path[0];
        const laneOffset = (index - (TOTAL_RACERS - 1) / 2) * 1.2;
        const perpX = -startSeg.dirZ;
        const perpZ = startSeg.dirX;

        return {
            index,
            isPlayer,
            segIndex: 0,
            segProgress: 0,
            x: startSeg.x + perpX * laneOffset,
            y: startSeg.y,
            z: startSeg.z + perpZ * laneOffset - index * 1.5,
            lateralOffset: laneOffset,
            speed: 0,
            velY: 0,
            color,
            alive: true,
            finished: false,
            finishTime: 0,
            position: index + 1,
            // AI specific
            targetLane: 0,
            laneChangeTimer: 0,
            // Power-ups
            activePowerup: null,
            powerupTimer: 0,
            shielded: false,
            speedBoost: 0,
            giant: false,
        };
    }

    // ============================================================
    // GAME LOGIC
    // ============================================================
    function getSegmentAt(segIndex) {
        if (segIndex < 0) return currentSlide.path[0];
        if (segIndex >= currentSlide.path.length) return currentSlide.path[currentSlide.path.length - 1];
        return currentSlide.path[segIndex];
    }

    function getSlidePositionAt(segIndex, segProgress, lateralOffset) {
        const seg = getSegmentAt(segIndex);
        const nextSeg = getSegmentAt(segIndex + 1);

        const t = segProgress;
        const x = seg.x + (nextSeg.x - seg.x) * t;
        const y = seg.y + (nextSeg.y - seg.y) * t;
        const z = seg.z + (nextSeg.z - seg.z) * t;

        const perpX = -(seg.dirZ + (nextSeg.dirZ - seg.dirZ) * t);
        const perpZ = seg.dirX + (nextSeg.dirX - seg.dirX) * t;
        const len = Math.sqrt(perpX * perpX + perpZ * perpZ) || 1;

        return {
            x: x + (perpX / len) * lateralOffset,
            y: y,
            z: z + (perpZ / len) * lateralOffset,
            dirX: seg.dirX + (nextSeg.dirX - seg.dirX) * t,
            dirZ: seg.dirZ + (nextSeg.dirZ - seg.dirZ) * t,
            perpX: perpX / len,
            perpZ: perpZ / len,
        };
    }

    function updateRacer(racer, dt) {
        if (!racer.alive || racer.finished) return;

        const seg = getSegmentAt(racer.segIndex);
        const nextSeg = getSegmentAt(racer.segIndex + 1);

        // Speed calculation
        const slopeFactor = (seg.y - nextSeg.y) / SLIDE_SEGMENT_LENGTH;
        const baseAccel = GRAVITY + slopeFactor * 0.02;
        racer.speed += baseAccel;
        racer.speed *= 0.985; // friction

        // Speed boost from power-up
        if (racer.speedBoost > 0) {
            racer.speed += 0.005;
            racer.speedBoost -= dt;
        }

        // Clamp speed
        const maxSpd = racer.speedBoost > 0 ? MAX_SPEED * 1.5 : MAX_SPEED;
        racer.speed = Math.max(BASE_SPEED * 0.5, Math.min(racer.speed, maxSpd));

        // Advance along path
        racer.segProgress += racer.speed * dt * 30;

        while (racer.segProgress >= 1 && racer.segIndex < currentSlide.path.length - 2) {
            racer.segProgress -= 1;
            racer.segIndex++;
        }

        // Check finish
        if (racer.segIndex >= currentSlide.path.length - 3) {
            racer.finished = true;
            racer.finishTime = raceTime;
            if (racer.isPlayer) {
                playSound('splash');
            }
            playSound('splash');
            const pos = getSlidePositionAt(racer.segIndex, racer.segProgress, racer.lateralOffset);
            createSplash(pos.x, pos.y, pos.z);
            return;
        }

        // Lateral movement
        if (racer.isPlayer) {
            racer.lateralOffset += steerInput * STEER_SPEED * dt * 60;
        } else {
            // AI steering
            updateAI(racer, dt);
        }

        // Clamp to slide width
        const halfW = seg.width / 2 - PLAYER_RADIUS;
        const effectiveRadius = racer.giant ? halfW * 0.9 : halfW;
        racer.lateralOffset = Math.max(-effectiveRadius, Math.min(effectiveRadius, racer.lateralOffset));

        // Compute world position
        const pos = getSlidePositionAt(racer.segIndex, racer.segProgress, racer.lateralOffset);
        racer.x = pos.x;
        racer.y = pos.y;
        racer.z = pos.z;

        // Power-up timer
        if (racer.powerupTimer > 0) {
            racer.powerupTimer -= dt;
            if (racer.powerupTimer <= 0) {
                racer.activePowerup = null;
                racer.shielded = false;
                racer.speedBoost = 0;
                racer.giant = false;
                // Reset scale
                if (racerMeshes[racer.index]) {
                    racerMeshes[racer.index].scale.set(1, 1, 1);
                }
            }
        }
    }

    function updateAI(racer, dt) {
        const difficulty = currentLevel.aiDifficulty;

        racer.laneChangeTimer -= dt;
        if (racer.laneChangeTimer <= 0) {
            racer.laneChangeTimer = 0.5 + Math.random() * 1.5;

            // Decide lane target
            // Check for nearby obstacles
            let bestLane = racer.lateralOffset;
            let avoidance = 0;

            // Avoid obstacles
            for (const obs of currentSlide.obstacles) {
                const segDist = obs.segIndex - racer.segIndex;
                if (segDist > 0 && segDist < 15) {
                    const pos = getSlidePositionAt(racer.segIndex, racer.segProgress, racer.lateralOffset);
                    const dx = obs.x - pos.x;
                    const dz = obs.z - pos.z;
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    if (dist < 3) {
                        avoidance = racer.lateralOffset > 0 ? -1 : 1;
                    }
                }
            }

            // Seek coins occasionally
            if (Math.random() < difficulty * 0.5) {
                let nearestCoin = null;
                let nearestDist = 20;
                for (const coin of currentSlide.coins) {
                    if (coin.collected) continue;
                    const segDist = coin.segIndex - racer.segIndex;
                    if (segDist > 0 && segDist < 15 && segDist < nearestDist) {
                        nearestDist = segDist;
                        nearestCoin = coin;
                    }
                }
                if (nearestCoin && avoidance === 0) {
                    const seg = getSegmentAt(racer.segIndex);
                    const perpX = -seg.dirZ;
                    const perpZ = seg.dirX;
                    const coinLateral = (nearestCoin.x - seg.x) * perpX + (nearestCoin.z - seg.z) * perpZ;
                    bestLane = coinLateral;
                }
            }

            if (avoidance !== 0) {
                racer.targetLane = racer.lateralOffset + avoidance * 2;
            } else {
                racer.targetLane = bestLane + (Math.random() - 0.5) * 2;
            }
        }

        // Move toward target lane
        const laneError = racer.targetLane - racer.lateralOffset;
        const steerAmount = Math.sign(laneError) * Math.min(Math.abs(laneError), STEER_SPEED * difficulty * 1.5) * dt * 60;
        racer.lateralOffset += steerAmount;

        // AI speed variation based on difficulty
        racer.speed *= (0.98 + difficulty * 0.02);
    }

    function checkCollisions() {
        const player = racers[playerIndex];
        if (!player || !player.alive) return;

        // Player vs AI racers
        for (let i = 0; i < racers.length; i++) {
            if (i === playerIndex || !racers[i].alive || racers[i].finished) continue;
            const other = racers[i];
            const dx = player.x - other.x;
            const dy = player.y - other.y;
            const dz = player.z - other.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const collisionDist = (player.giant ? PLAYER_RADIUS * 2 : PLAYER_RADIUS) + PLAYER_RADIUS;

            if (dist < collisionDist && dist > 0) {
                // Push apart
                const nx = dx / dist;
                const nz = dz / dist;
                player.lateralOffset += nx * PUSH_FORCE;
                other.lateralOffset -= nx * PUSH_FORCE;

                // If player is giant or faster, eliminate
                if (player.giant || (player.speed > other.speed * 1.15 && !other.shielded)) {
                    // Check if player is pushing them off edge
                    const seg = getSegmentAt(other.segIndex);
                    const halfW = seg.width / 2;
                    if (Math.abs(other.lateralOffset) > halfW * 0.9 || player.giant) {
                        eliminateRacer(i);
                    }
                }
                playSound('bump');
                createSplash(
                    (player.x + other.x) / 2,
                    (player.y + other.y) / 2,
                    (player.z + other.z) / 2
                );
            }
        }

        // Player vs coins
        for (let i = 0; i < currentSlide.coins.length; i++) {
            const coin = currentSlide.coins[i];
            if (coin.collected) continue;
            const dx = player.x - coin.x;
            const dy = player.y - coin.y;
            const dz = player.z - coin.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const collectDist = player.giant ? 2.5 : (player.activePowerup === 'magnet' ? 3.0 : 1.0);
            if (dist < collectDist) {
                coin.collected = true;
                coinsCollected++;
                if (coinMeshes[i]) coinMeshes[i].visible = false;
                playSound('coin');
                updateHUD();
            }
        }

        // Player vs obstacles
        for (let i = 0; i < currentSlide.obstacles.length; i++) {
            const obs = currentSlide.obstacles[i];
            const dx = player.x - obs.x;
            const dy = player.y - obs.y;
            const dz = player.z - obs.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist < 1.0) {
                if (player.shielded || player.giant) {
                    // Destroy obstacle
                    if (obstacleMeshes[i]) obstacleMeshes[i].visible = false;
                    playSound('bump');
                } else {
                    player.speed *= 0.3;
                    playSound('bump');
                }
            }
        }

        // Player vs power-ups
        for (let i = 0; i < currentSlide.powerups.length; i++) {
            const pu = currentSlide.powerups[i];
            if (pu.collected) continue;
            const dx = player.x - pu.x;
            const dy = player.y - pu.y;
            const dz = player.z - pu.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist < 1.2) {
                pu.collected = true;
                if (powerupMeshes[i]) powerupMeshes[i].visible = false;
                activatePowerup(player, pu.type);
                playSound('powerup');
            }
        }

        // Player vs ramps
        for (let i = 0; i < currentSlide.ramps.length; i++) {
            const ramp = currentSlide.ramps[i];
            const segDist = Math.abs(ramp.segIndex - player.segIndex);
            if (segDist < 2 && player.speed > BASE_SPEED) {
                player.speed *= 1.3;
                createSplash(player.x, player.y, player.z);
            }
        }
    }

    function activatePowerup(racer, type) {
        racer.activePowerup = type;
        racer.powerupTimer = 5;
        switch(type) {
            case 'speed':
                racer.speedBoost = 5;
                break;
            case 'shield':
                racer.shielded = true;
                break;
            case 'magnet':
                // Magnet handled in collision detection
                break;
            case 'giant':
                racer.giant = true;
                if (racerMeshes[racer.index]) {
                    racerMeshes[racer.index].scale.set(1.8, 1.8, 1.8);
                }
                break;
        }

        // Show powerup indicator
        const indicator = document.getElementById('powerup-indicator');
        const icons = { speed: '⚡', shield: '🛡️', magnet: '🧲', giant: '🔥' };
        indicator.textContent = icons[type] || '✨';
        indicator.classList.remove('hidden');
        setTimeout(() => indicator.classList.add('hidden'), 500);
    }

    function eliminateRacer(index) {
        const racer = racers[index];
        if (!racer.alive) return;
        racer.alive = false;
        eliminationCount++;
        if (racerMeshes[index]) racerMeshes[index].visible = false;
        createSplash(racer.x, racer.y, racer.z);
        playSound('eliminate');
        updateHUD();
    }

    function calculatePositions() {
        // Sort racers by progress (segment index + progress)
        const sorted = racers
            .filter(r => r.alive || r.finished)
            .sort((a, b) => {
                if (a.finished && !b.finished) return -1;
                if (!a.finished && b.finished) return 1;
                if (a.finished && b.finished) return a.finishTime - b.finishTime;
                return (b.segIndex + b.segProgress) - (a.segIndex + a.segProgress);
            });

        sorted.forEach((racer, i) => {
            racer.position = i + 1;
        });
    }

    // ============================================================
    // CAMERA
    // ============================================================
    function updateCamera(player) {
        if (!player) return;

        const seg = getSegmentAt(player.segIndex);
        const targetX = player.x - seg.dirX * 6;
        const targetY = player.y + 5;
        const targetZ = player.z - seg.dirZ * 6;

        camera.position.x += (targetX - camera.position.x) * 0.08;
        camera.position.y += (targetY - camera.position.y) * 0.08;
        camera.position.z += (targetZ - camera.position.z) * 0.08;

        const lookX = player.x + seg.dirX * 3;
        const lookY = player.y;
        const lookZ = player.z + seg.dirZ * 3;

        camera.lookAt(lookX, lookY, lookZ);
    }

    // ============================================================
    // HUD
    // ============================================================
    function updateHUD() {
        const player = racers[playerIndex];
        if (!player) return;

        // Progress
        const progress = player.segIndex / (currentSlide.path.length - 1);
        document.getElementById('progress-bar').style.width = (progress * 100) + '%';
        document.getElementById('progress-marker').style.left = (progress * 100) + '%';

        // Position
        const posText = getPositionText(player.position);
        document.getElementById('position-display').textContent = posText;

        // Stats
        document.getElementById('skull-count').textContent = `💀 x${eliminationCount}`;
        document.getElementById('coin-count').textContent = `⭐ x${coinsCollected}`;
    }

    function getPositionText(pos) {
        const suffixes = { 1: 'st', 2: 'nd', 3: 'rd' };
        return pos + (suffixes[pos] || 'th');
    }

    // ============================================================
    // GAME LOOP
    // ============================================================
    function gameLoop(timestamp) {
        animFrameId = requestAnimationFrame(gameLoop);

        const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
        lastTime = timestamp;

        if (gameState === 'playing') {
            raceTime += dt;

            // Update racers
            for (const racer of racers) {
                updateRacer(racer, dt);
            }

            // Collisions
            checkCollisions();

            // Positions
            calculatePositions();

            // Update meshes
            for (let i = 0; i < racers.length; i++) {
                const racer = racers[i];
                const mesh = racerMeshes[i];
                if (!mesh) continue;
                if (!racer.alive && !racer.finished) {
                    mesh.visible = false;
                    continue;
                }
                mesh.position.set(racer.x, racer.y, racer.z);
                // Face direction of travel
                const seg = getSegmentAt(racer.segIndex);
                mesh.rotation.y = Math.atan2(seg.dirX, seg.dirZ);

                // Update label
                updateRacerLabel(mesh, getPositionText(racer.position), racer.isPlayer ? '#ff6b35' : '#fff');
            }

            // Animate coins
            const time = timestamp * 0.003;
            coinMeshes.forEach(m => {
                if (m.visible) {
                    m.rotation.y = time;
                    m.position.y += Math.sin(time * 2) * 0.003;
                }
            });

            // Animate power-ups
            powerupMeshes.forEach(m => {
                if (m.visible) {
                    m.rotation.y = time * 1.5;
                    m.rotation.x = time;
                    m.position.y += Math.sin(time * 2.5) * 0.003;
                }
            });

            // Particles
            updateParticles(dt);

            // Camera
            const player = racers[playerIndex];
            if (player) {
                updateCamera(player);

                // Check if player finished
                if (player.finished && gameState === 'playing') {
                    gameState = 'finished';
                    // Let remaining racers finish over 2 seconds
                    setTimeout(() => {
                        // Force finish remaining
                        racers.forEach(r => {
                            if (!r.finished && r.alive) {
                                r.finished = true;
                                r.finishTime = raceTime + 5;
                            }
                        });
                        calculatePositions();
                        showResults();
                    }, 2000);
                }
            }

            updateHUD();
        }

        // Render
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }

    // ============================================================
    // GAME FLOW
    // ============================================================
    function showScreen(screenId) {
        document.querySelectorAll('.screen, #game-container, #loading-screen').forEach(el => {
            el.classList.add('hidden');
        });
        const el = document.getElementById(screenId);
        if (el) el.classList.remove('hidden');
    }

    function showMenu() {
        gameState = 'menu';
        showScreen('main-menu');
        document.getElementById('menu-wins').textContent = saveData.wins;
        document.getElementById('menu-coins').textContent = saveData.coins;
        document.getElementById('menu-level').textContent = saveData.highestLevel;
    }

    function showLevelSelect() {
        gameState = 'levelSelect';
        showScreen('level-select');
        const grid = document.getElementById('level-grid');
        grid.innerHTML = '';

        for (let i = 0; i < LEVELS.length; i++) {
            const level = LEVELS[i];
            const unlocked = i + 1 <= saveData.highestLevel;
            const stars = saveData.levelStars[level.id] || 0;

            const card = document.createElement('div');
            card.className = `level-card ${unlocked ? (stars > 0 ? 'completed' : 'unlocked') : 'locked'}`;

            if (unlocked) {
                card.innerHTML = `
                    <div class="level-number">${level.id}</div>
                    <div class="level-stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
                `;
                card.addEventListener('click', () => startLevel(level.id));
            } else {
                card.innerHTML = `
                    <div class="level-lock">🔒</div>
                    <div class="level-number">${level.id}</div>
                `;
            }

            grid.appendChild(card);
        }
    }

    function showCustomize() {
        gameState = 'customize';
        showScreen('customize-screen');
        document.getElementById('customize-coins').textContent = saveData.coins;

        // Preview
        const preview = document.getElementById('customize-preview');
        const selectedSkin = SKINS.find(s => s.id === saveData.selectedSkin) || SKINS[0];
        preview.innerHTML = `<div style="font-size:5rem">${selectedSkin.emoji}</div>`;

        // Skin grid
        const grid = document.getElementById('skin-grid');
        grid.innerHTML = '';

        SKINS.forEach(skin => {
            const owned = saveData.unlockedSkins.includes(skin.id);
            const selected = saveData.selectedSkin === skin.id;

            const card = document.createElement('div');
            card.className = `skin-card ${selected ? 'selected' : ''} ${!owned ? 'locked' : ''}`;

            card.innerHTML = `
                <div class="skin-emoji">${skin.emoji}</div>
                <div class="skin-name">${skin.name}</div>
                ${!owned ? `<div class="skin-price">⭐${skin.price}</div>` : ''}
            `;

            card.addEventListener('click', () => {
                if (owned) {
                    saveData.selectedSkin = skin.id;
                    saveSave(saveData);
                    showCustomize();
                } else if (saveData.coins >= skin.price) {
                    saveData.coins -= skin.price;
                    saveData.unlockedSkins.push(skin.id);
                    saveData.selectedSkin = skin.id;
                    saveSave(saveData);
                    showCustomize();
                }
            });

            grid.appendChild(card);
        });
    }

    function startLevel(levelId) {
        currentLevel = LEVELS[levelId - 1];
        if (!currentLevel) return;

        saveData.currentLevel = levelId;
        saveSave(saveData);

        // Init Three.js if needed
        if (!renderer) initThree();

        // Clear previous
        clearScene();

        // Generate slide
        currentSlide = generateSlide(currentLevel);

        // Build visuals
        buildSlideMesh(currentSlide);
        buildItems(currentSlide);

        // Create racers
        racers = [];
        racerMeshes.forEach(m => scene.remove(m));
        racerMeshes = [];

        const playerSkin = SKINS.find(s => s.id === saveData.selectedSkin) || SKINS[0];

        for (let i = 0; i < TOTAL_RACERS; i++) {
            const isPlayer = i === 0;
            const color = isPlayer ? playerSkin.color : AI_COLORS[i % AI_COLORS.length];
            const racer = initRacer(i, color, isPlayer);
            racers.push(racer);

            const mesh = createRacerMesh(color);
            scene.add(mesh);
            racerMeshes.push(mesh);
        }
        playerIndex = 0;

        // Reset state
        raceTime = 0;
        coinsCollected = 0;
        eliminationCount = 0;
        steerInput = 0;

        // Show game
        showScreen('game-container');
        document.getElementById('game-container').classList.remove('hidden');

        // Position camera at start
        const startSeg = currentSlide.path[0];
        camera.position.set(startSeg.x - startSeg.dirX * 8, startSeg.y + 8, startSeg.z - startSeg.dirZ * 8);
        camera.lookAt(startSeg.x, startSeg.y, startSeg.z);

        updateHUD();

        // Start countdown
        gameState = 'countdown';
        startCountdown();
    }

    function startCountdown() {
        const countdownEl = document.getElementById('countdown');
        const textEl = document.getElementById('countdown-text');
        countdownEl.classList.remove('hidden');

        let count = 3;
        textEl.textContent = count;
        playSound('countdown');

        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                textEl.textContent = count;
                textEl.style.animation = 'none';
                void textEl.offsetHeight; // reflow
                textEl.style.animation = '';
                playSound('countdown');
            } else if (count === 0) {
                textEl.textContent = 'GO!';
                textEl.style.color = '#4caf50';
                textEl.style.animation = 'none';
                void textEl.offsetHeight;
                textEl.style.animation = '';
                playSound('go');
            } else {
                countdownEl.classList.add('hidden');
                textEl.style.color = '';
                gameState = 'playing';
                clearInterval(interval);
            }
        }, 1000);

        // Start render loop
        if (!animFrameId) {
            lastTime = performance.now();
            animFrameId = requestAnimationFrame(gameLoop);
        }
    }

    function showResults() {
        gameState = 'results';
        const player = racers[playerIndex];
        const position = player.position;

        // Calculate rewards
        const positionMultiplier = Math.max(1, TOTAL_RACERS + 1 - position);
        const coinReward = coinsCollected * COIN_VALUE + eliminationCount * ELIMINATION_BONUS;
        const totalReward = coinReward * positionMultiplier;

        // Stars based on position
        let stars = 0;
        if (position === 1) stars = 3;
        else if (position === 2) stars = 2;
        else if (position <= 3) stars = 1;

        // Update save
        saveData.coins += totalReward;
        saveData.totalRaces++;
        if (position === 1) {
            saveData.wins++;
            playSound('win');
        }
        if (position <= 2 && currentLevel.id >= saveData.highestLevel) {
            saveData.highestLevel = Math.min(currentLevel.id + 1, LEVELS.length);
        }
        const prevStars = saveData.levelStars[currentLevel.id] || 0;
        saveData.levelStars[currentLevel.id] = Math.max(prevStars, stars);
        saveSave(saveData);

        // Show results screen
        showScreen('results-screen');
        document.getElementById('game-container').classList.remove('hidden'); // Keep 3D visible

        const posEl = document.getElementById('results-position');
        posEl.textContent = getPositionText(position);
        posEl.className = 'results-position ' + (position === 1 ? 'gold' : position === 2 ? 'silver' : position === 3 ? 'bronze' : '');

        document.getElementById('results-title').textContent = position === 1 ? 'VICTORY!' : position <= 2 ? 'GREAT RACE!' : 'RACE COMPLETE';
        document.getElementById('result-coins').textContent = coinsCollected;
        document.getElementById('result-eliminations').textContent = eliminationCount;
        document.getElementById('result-time').textContent = formatTime(raceTime);
        document.getElementById('reward-coins').textContent = totalReward;

        // Show/hide next level button
        const nextBtn = document.getElementById('next-level-btn');
        if (position <= 2 && currentLevel.id < LEVELS.length) {
            nextBtn.classList.remove('hidden');
        } else {
            nextBtn.classList.add('hidden');
        }
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // ============================================================
    // INPUT HANDLING
    // ============================================================
    function setupInput() {
        // Keyboard
        document.addEventListener('keydown', e => {
            if (gameState !== 'playing') return;
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') steerInput = -1;
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') steerInput = 1;
        });

        document.addEventListener('keyup', e => {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                if (steerInput === -1) steerInput = 0;
            }
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                if (steerInput === 1) steerInput = 0;
            }
        });

        // Touch - swipe/drag
        const gameContainer = document.getElementById('game-container');

        gameContainer.addEventListener('touchstart', e => {
            if (gameState !== 'playing') return;
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            isTouching = true;
        }, { passive: true });

        gameContainer.addEventListener('touchmove', e => {
            if (!isTouching || gameState !== 'playing') return;
            const touch = e.touches[0];
            const dx = touch.clientX - touchStartX;
            const sensitivity = window.innerWidth * 0.15;

            if (Math.abs(dx) > 10) {
                steerInput = Math.max(-1, Math.min(1, dx / sensitivity));
            } else {
                steerInput = 0;
            }
        }, { passive: true });

        gameContainer.addEventListener('touchend', () => {
            isTouching = false;
            steerInput = 0;
        }, { passive: true });

        // Mouse (for desktop testing)
        let mouseDown = false;
        let mouseStartX = 0;

        gameContainer.addEventListener('mousedown', e => {
            if (gameState !== 'playing') return;
            mouseDown = true;
            mouseStartX = e.clientX;
        });

        gameContainer.addEventListener('mousemove', e => {
            if (!mouseDown || gameState !== 'playing') return;
            const dx = e.clientX - mouseStartX;
            const sensitivity = window.innerWidth * 0.15;
            steerInput = Math.max(-1, Math.min(1, dx / sensitivity));
        });

        gameContainer.addEventListener('mouseup', () => {
            mouseDown = false;
            steerInput = 0;
        });

        // Touch zone controls (tap left/right)
        document.getElementById('touch-left').addEventListener('touchstart', e => {
            if (gameState !== 'playing') return;
            e.stopPropagation();
            steerInput = -1;
        }, { passive: false });

        document.getElementById('touch-left').addEventListener('touchend', e => {
            e.stopPropagation();
            if (steerInput === -1) steerInput = 0;
        }, { passive: false });

        document.getElementById('touch-right').addEventListener('touchstart', e => {
            if (gameState !== 'playing') return;
            e.stopPropagation();
            steerInput = 1;
        }, { passive: false });

        document.getElementById('touch-right').addEventListener('touchend', e => {
            e.stopPropagation();
            if (steerInput === 1) steerInput = 0;
        }, { passive: false });
    }

    // ============================================================
    // MENU BUTTONS
    // ============================================================
    function setupMenus() {
        document.getElementById('play-btn').addEventListener('click', () => {
            startLevel(saveData.currentLevel);
        });

        document.getElementById('select-level-btn').addEventListener('click', showLevelSelect);
        document.getElementById('customize-btn').addEventListener('click', showCustomize);

        document.getElementById('level-back-btn').addEventListener('click', showMenu);
        document.getElementById('customize-back-btn').addEventListener('click', showMenu);

        document.getElementById('next-level-btn').addEventListener('click', () => {
            const nextId = currentLevel.id + 1;
            if (nextId <= LEVELS.length) {
                startLevel(nextId);
            } else {
                showMenu();
            }
        });

        document.getElementById('retry-btn').addEventListener('click', () => {
            startLevel(currentLevel.id);
        });

        document.getElementById('results-menu-btn').addEventListener('click', () => {
            if (animFrameId) {
                cancelAnimationFrame(animFrameId);
                animFrameId = null;
            }
            showMenu();
        });

        // PWA Install
        let deferredPrompt = null;
        window.addEventListener('beforeinstallprompt', e => {
            e.preventDefault();
            deferredPrompt = e;
            document.getElementById('install-btn').classList.remove('hidden');
        });

        document.getElementById('install-btn').addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const result = await deferredPrompt.userChoice;
                if (result.outcome === 'accepted') {
                    document.getElementById('install-btn').classList.add('hidden');
                }
                deferredPrompt = null;
            }
        });
    }

    // ============================================================
    // INITIALIZATION
    // ============================================================
    function init() {
        setupInput();
        setupMenus();

        // Hide loading screen and show menu
        setTimeout(() => {
            document.getElementById('loading-screen').classList.add('hidden');
            showMenu();
        }, 1500);
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
