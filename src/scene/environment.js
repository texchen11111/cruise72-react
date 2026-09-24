import * as THREE from 'three';
import { OrbitControls } from '/vendor/OrbitControls.js';
import { GRID, ORIGIN, PITCH } from '../model/index.js';
import { cube } from './primitives.js';

// Pure environment: renderer, camera, lights, wall, floor, dimension grid
// lines and view switching. Owns no physical prop or module geometry
// (rails live in moduleGeometry.js as fixed props).
export function createEnvironment(ctx, stage) {
  const { mat, shared } = ctx.materials;

  function dimensions() {
    const g = new THREE.Group();
    const points = [];
    for (let i = 0; i <= GRID[0]; i++) {
      const x = ORIGIN[0] + i * PITCH,
        y = ORIGIN[1] + i * PITCH;
      points.push(x, 0.01, 0.002, x, 2.89, 0.002, -1.44, y, 0.002, 1.44, y, 0.002);
    }
    for (let z = 0; z <= 24; z++) {
      const d = z * PITCH;
      points.push(-1.44, 0.005, d, 1.44, 0.005, d);
    }
    for (let x = 0; x <= GRID[0]; x++) {
      const v = -1.44 + x * PITCH;
      points.push(v, 0.005, 0, v, 0.005, 24 * PITCH);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    g.add(
      new THREE.LineSegments(
        geo,
        new THREE.LineBasicMaterial({ color: '#8a9ab1', transparent: true, opacity: 0.27 }),
      ),
    );
    g.visible = true;
    ctx.scene.add(g);
    return g;
  }

  function init() {
    ctx.scene = new THREE.Scene();
    ctx.scene.background = new THREE.Color('#f0f2f5');
    ctx.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    ctx.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    ctx.renderer.shadowMap.enabled = true;
    ctx.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    ctx.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    ctx.renderer.toneMappingExposure = 1.25;
    stage.prepend(ctx.renderer.domElement);
    ctx.camera = new THREE.PerspectiveCamera(40, 1, 0.01, 80);
    ctx.orbit = new OrbitControls(ctx.camera, ctx.renderer.domElement);
    ctx.orbit.enableDamping = true;
    ctx.orbit.minDistance = 1.8;
    ctx.orbit.maxDistance = 8;
    ctx.orbit.maxPolarAngle = Math.PI / 2 + 0.08;
    ctx.orbit.minAzimuthAngle = -Math.PI / 2.5;
    ctx.orbit.maxAzimuthAngle = Math.PI / 2.5;
    ctx.orbit.target.set(0, 1.35, 0);
    ctx.camera.position.set(3.7, 2.4, 5.8);
    ctx.orbit.update();
    ctx.ambient = new THREE.HemisphereLight('#ffffff', '#798192', 2.5);
    ctx.scene.add(ctx.ambient);
    ctx.sun = new THREE.DirectionalLight('#fff7e9', 3);
    ctx.sun.position.set(-3, 5, 5);
    ctx.sun.castShadow = true;
    ctx.sun.shadow.mapSize.set(2048, 2048);
    ctx.sun.shadow.camera.left = -3;
    ctx.sun.shadow.camera.right = 3;
    ctx.sun.shadow.camera.top = 4;
    ctx.sun.shadow.camera.bottom = -1;
    ctx.sun.normalBias = 0.008;
    ctx.scene.add(ctx.sun);
    const wallMat = mat('#f5f4ef');
    const floorMat = mat('#d9dde3');
    cube(ctx.scene, 2.9, 2.9, 0.1, 0, 1.45, -0.05, wallMat);
    // Secondary mounting frame is illustrative; exact rail adapter design remains unverified.
    cube(ctx.scene, 9, 0.04, 6, 0, -0.022, 1.3, floorMat);
    ctx.dimensionGroup = dimensions();
    ctx.selectionBox = new THREE.Box3Helper(new THREE.Box3(), 0x3158e8);
    ctx.selectionBox.material.depthTest = false;
    ctx.selectionBox.material.transparent = true;
    ctx.selectionBox.material.opacity = 0.6;
    ctx.scene.add(ctx.selectionBox);
  }

  function resize() {
    if (!ctx.renderer) return;
    const w = stage.clientWidth,
      h = stage.clientHeight;
    ctx.renderer.setSize(w, h, false);
    ctx.camera.aspect = w / h;
    ctx.camera.updateProjectionMatrix();
  }

  function setView(v) {
    if (!ctx.orbit) return;
    ctx.view = v;
    ctx.orbit.enableRotate = v === '3d';
    ctx.orbit.target.set(0, 1.4, 0);
    ctx.camera.position.set(
      v === 'front' ? 0 : 3.7,
      v === 'front' ? 1.4 : 2.4,
      v === 'front' ? 6.1 : 5.8,
    );
    ctx.orbit.update();
  }

  return { init, resize, setView };
}
