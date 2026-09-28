import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { ORIGIN, PITCH } from '../model/index.js';
import { cube } from './primitives.js';

export function createEnvironment(ctx, stage, options = {}) {
  let wallMat, floorMat;
  function dimensions() {
    const g = new THREE.Group();
    const points = [];
    for (let i = 0; i <= 60; i++) {
      const x = ORIGIN[0] + i * PITCH,
        y = ORIGIN[1] + i * PITCH;
      points.push(x, 0.01, 0.002, x, 2.89, 0.002, -1.44, y, 0.002, 1.44, y, 0.002);
    }
    for (let z = 0; z <= 24; z++) {
      const d = z * PITCH;
      points.push(-1.44, 0.005, d, 1.44, 0.005, d);
    }
    for (let x = 0; x <= 60; x++) {
      const v = -1.44 + x * PITCH;
      points.push(v, 0.005, 0, v, 0.005, 24 * PITCH);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    g.add(
      new THREE.LineSegments(
        geo,
        new THREE.LineBasicMaterial({ color: '#8a9ab1', transparent: true, opacity: 0.13 }),
      ),
    );
    g.visible = true;
    ctx.scene.add(g);
    return g;
  }

  function init3D() {
    ctx.scene = new THREE.Scene();
    ctx.scene.background = new THREE.Color('#e9e7e1');
    // Some embedded browsers reject multisampling or a preserved drawing
    // buffer even though ordinary WebGL is available. Retry with the lowest
    // compatible context before the UI falls back to the plan view.
    try {
      ctx.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    } catch (firstError) {
      try {
        ctx.renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: false, powerPreference: 'low-power' });
      } catch {
        throw firstError;
      }
    }
    ctx.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    ctx.renderer.shadowMap.enabled = true;
    ctx.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    ctx.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    ctx.renderer.toneMappingExposure = 1.05;
    ctx.renderer.outputColorSpace = THREE.SRGBColorSpace;
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
    ctx.ambient = new THREE.HemisphereLight('#fffdf8', '#b1aaa0', 1.8);
    ctx.scene.add(ctx.ambient);
    ctx.sun = new THREE.DirectionalLight('#fff8ee', 2.5);
    ctx.sun.position.set(-3.5, 6, 4.5);
    ctx.sun.castShadow = true;
    ctx.sun.shadow.mapSize.set(2048, 2048);
    ctx.sun.shadow.camera.left = -3;
    ctx.sun.shadow.camera.right = 3;
    ctx.sun.shadow.camera.top = 4;
    ctx.sun.shadow.camera.bottom = -1;
    ctx.sun.shadow.normalBias = 0.002;
    ctx.sun.shadow.bias = -0.00008;
    ctx.sun.shadow.radius = 4;
    ctx.scene.add(ctx.sun);
    // Studio reflection cards: a neutral room plus large bright panels give metal readable highlights.
    const studio = new THREE.Scene();
    studio.background = new THREE.Color('#d6d4cf');
    for (const [x, y, z, w, h, power] of [
      [-3, 3, 2, 3, 4, 4],
      [4, 2, 1, 2, 4, 2],
      [0, 5, -1, 4, 3, 3],
    ]) {
      const card = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color().setScalar(power),
          side: THREE.DoubleSide,
        }),
      );
      card.position.set(x, y, z);
      card.lookAt(0, 1, 0);
      studio.add(card);
    }
    const pmrem = new THREE.PMREMGenerator(ctx.renderer);
    ctx.studioEnvironment = pmrem.fromScene(studio, 0.08, 0.1, 30);
    ctx.scene.environment = ctx.studioEnvironment.texture;
    ctx.scene.environmentIntensity = 0.65;
    pmrem.dispose();
    studio.traverse((o) => {
      o.geometry?.dispose();
      o.material?.dispose();
    });
    const fill = new THREE.DirectionalLight('#f0f4ff', 0.65);
    fill.position.set(4, 3, 1);
    ctx.scene.add(fill);
    if (options.preview) {
      ctx.scene.background = new THREE.Color('#f5f4f0');
      const groups = ctx.items.map(ctx.buildModule);
      const bounds = new THREE.Box3();
      groups.forEach((g) => bounds.expandByObject(g));
      const center = bounds.getCenter(new THREE.Vector3()),
        size = bounds.getSize(new THREE.Vector3());
      const radius = Math.max(size.x, size.y, size.z, 0.08),
        aspect = stage.clientWidth / stage.clientHeight;
      // Orthographic product photography preserves parallel edges; fit the projected model bounds.
      ctx.orbit.dispose();
      ctx.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.001, 100);
      ctx.camera.position
        .copy(center)
        .add(new THREE.Vector3(0.65, 0.42, 1.8).multiplyScalar(radius * 3));
      ctx.camera.lookAt(center);
      ctx.camera.updateMatrixWorld();
      const projected = new THREE.Box3();
      for (const x of [bounds.min.x, bounds.max.x])
        for (const y of [bounds.min.y, bounds.max.y])
          for (const z of [bounds.min.z, bounds.max.z])
            projected.expandByPoint(
              new THREE.Vector3(x, y, z).applyMatrix4(ctx.camera.matrixWorldInverse),
            );
      const projectedSize = projected.getSize(new THREE.Vector3());
      const half = Math.max(projectedSize.y, projectedSize.x / aspect) * 0.65;
      ctx.camera.left = -half * aspect;
      ctx.camera.right = half * aspect;
      ctx.camera.top = half;
      ctx.camera.bottom = -half;
      ctx.camera.updateProjectionMatrix();
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(radius * 12, radius * 12),
        new THREE.MeshStandardMaterial({ color: '#f5f4f0', roughness: 1 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(center.x, bounds.min.y - 0.002, center.z);
      ground.receiveShadow = true;
      ctx.scene.add(ground);
      ctx.sun.target.position.copy(center);
      ctx.scene.add(ctx.sun.target);
      ctx.sun.position.copy(center).add(new THREE.Vector3(-2, 4, 3).multiplyScalar(radius));
      ctx.sun.shadow.camera.left = -radius * 2;
      ctx.sun.shadow.camera.right = radius * 2;
      ctx.sun.shadow.camera.top = radius * 2;
      ctx.sun.shadow.camera.bottom = -radius * 2;
      ctx.sun.shadow.camera.near = 0.001;
      ctx.sun.shadow.camera.far = radius * 12;
      ctx.sun.shadow.camera.updateProjectionMatrix();
      ctx.sun.shadow.normalBias = radius * 0.001;
      ctx.renderer.setSize(stage.clientWidth, stage.clientHeight, false);
      ctx.renderer.render(ctx.scene, ctx.camera);
      return;
    }
    wallMat = new THREE.MeshStandardMaterial({ color: '#f7f6f2', roughness: 0.92 });
    floorMat = new THREE.MeshStandardMaterial({ color: '#ddd8ce', roughness: 0.84 });
    cube(ctx.scene, 2.9, 2.9, 0.1, 0, 1.45, -0.05, wallMat);
    cube(ctx.scene, 9, 0.04, 6, 0, -0.022, 1.3, floorMat); // Secondary mounting frame is illustrative; exact rail adapter design remains unverified.

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
  return { init: init3D, resize, setView };
}
