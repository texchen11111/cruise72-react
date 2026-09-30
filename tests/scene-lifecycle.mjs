import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { createPlannerStore } from '../src/store/index.js';
import { mountPoints, ORIGIN, PITCH } from '../src/model/index.js';

// Run the real scene/environment orchestration; replace only GPU operations.
const dom = new JSDOM('<!doctype html><div id="stage"></div>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.devicePixelRatio = 1;
dom.window.HTMLCanvasElement.prototype.getContext = () => ({
  fillRect() {},
  fillText() {},
  beginPath() {},
  moveTo() {},
  lineTo() {},
  stroke() {},
});
dom.window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,test';
const frames = new Map();
globalThis.requestAnimationFrame = (fn) => {
  frames.set(1, fn);
  return 1;
};
globalThis.cancelAnimationFrame = (id) => frames.delete(id);
let observing = false;
globalThis.ResizeObserver = class {
  observe() {
    observing = true;
  }
  disconnect() {
    observing = false;
  }
};

const result = await build({
  entryPoints: ['src/scene/createPlannerScene.js'],
  bundle: true,
  format: 'esm',
  write: false,
  plugins: [
    {
      name: 'gpu-boundary',
      setup(build) {
        build.onResolve({ filter: /^three$/ }, () => ({ path: 'three', namespace: 'gpu' }));
        build.onResolve({ filter: /^three\/addons\/OrbitControls\.js$/ }, () => ({
          path: 'orbit',
          namespace: 'gpu',
        }));
        build.onLoad({ filter: /.*/, namespace: 'gpu' }, ({ path }) => ({
          resolveDir: process.cwd(),
          contents:
            path === 'orbit'
              ? `
          import { Vector3 } from './vendor/three.module.js';
          export class OrbitControls {
            target = new Vector3();
            update() {}
            dispose() {}
          }
        `
              : `
          export * from './vendor/three.module.js';
          import { Texture } from './vendor/three.module.js';
          export class WebGLRenderer {
            domElement = document.createElement('canvas');
            shadowMap = {};
            constructor() {
              if (globalThis.__gpuFailure) throw globalThis.__gpuFailure;
              globalThis.__renderer = this;
            }
            setPixelRatio() {}
            setSize() {}
            render(scene) { this.scene = scene; }
            dispose() { this.disposed = true; }
            forceContextLoss() { this.contextLost = true; }
          }
          export class PMREMGenerator {
            fromScene() { return { texture: new Texture(), dispose() {} }; }
            dispose() {}
          }
        `,
        }));
      },
    },
  ],
});
const { createPlannerScene, generatePreview } = await import(
  'data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64')
);
const stage = document.getElementById('stage');
Object.defineProperties(stage, {
  clientWidth: { value: 800 },
  clientHeight: { value: 600 },
});
const store = createPlannerStore();
let engine;
// Catch bundled errors so regression failures don't print the entire data URL.
try {
  engine = createPlannerScene(stage, store);
} catch (error) {
  assert.fail(`Scene initialization failed: ${error.message}`);
}
const renderer = globalThis.__renderer;
assert.equal(stage.querySelectorAll('canvas').length, 1);
assert.ok(observing);
assert.equal(frames.size, 1);
const handles = () => {
  const found = [];
  renderer.scene.traverse((object) => {
    if (object.userData.resizeHandle) found.push(object);
  });
  return found;
};
assert.deepEqual(
  handles().map((h) => h.userData.resizeHandle.axis),
  ['x', 'y', 'z'],
);
// 检查实际 Three.js 节点世界坐标，不能只验证导出的坐标正确。
const assertMountGeometry = () => {
  renderer.scene.updateMatrixWorld(true);
  const bodies = [];
  renderer.scene.traverse((object) => {
    if (object.userData.mountPoint) bodies.push(object);
  });
  const data = store.getSnapshot().items;
  const expected = data.flatMap((a) => mountPoints(a, data));
  assert.equal(bodies.length, expected.length, '移动与重建不累积重复节点');
  for (const object of bodies) {
    const point = expected.find((p) => p.id === object.userData.mountPoint.id);
    assert.ok(point);
    const world = object.getWorldPosition(object.position.clone());
    assert.ok(Math.abs(world.x - ORIGIN[0] - (point.gx + 0.5) * PITCH) < 1e-9);
    assert.ok(Math.abs(world.y - ORIGIN[1] - (point.gy + 0.5) * PITCH) < 1e-9);
    assert.ok(Math.abs(world.z - (point.gz * PITCH + 0.024)) < 1e-9);
  }
};
assertMountGeometry();
assert.equal(store.moveItem('a', { gy: 4 }), true);
for (let i = 0; i < 4; i++) {
  assert.equal(store.moveItem('a', { gx: i % 2 ? 3 : 4 }), true);
  assertMountGeometry();
}
assert.equal(store.resizeItem('a', [16, 12, 1]), true);
assertMountGeometry();
// 厚度驱动：滑块随厚度沿导柱移动，锚点世界位置不动；非法厚度被拒绝。
const slidersOf = (ownerId) => {
  const found = [];
  renderer.scene.traverse((object) => {
    if (object.userData.slider && object.userData.slider.ownerId === ownerId) found.push(object);
  });
  return found;
};
const mechanismsOf = (ownerId) => {
  const found = [];
  renderer.scene.traverse((object) => {
    if (object.userData.mechanism && object.userData.mechanism.ownerId === ownerId)
      found.push(object);
  });
  return found;
};
{
  const upper = mechanismsOf('a').filter((m) => m.userData.mechanism.role === 'upper-limit');
  assert.equal(upper.length, 2, 'panel top row renders two upper-limit nodes');
  assert.ok(
    upper.every((m) => m.rotation.z === Math.PI),
    'upper-limit nodes rotate the clamp mechanism while hooks stay down',
  );
  const sliders = slidersOf('a');
  assert.equal(sliders.length, 4, 'panel renders four slider groups');
  assert.ok(
    sliders.every((s) => Math.abs(s.position.z + 0.001) < 1e-9),
    'sliders start at offset t-7 for the 6 mm reference thickness',
  );
  assert.equal(store.patchItem('a', { exhibitMm: 12 }), true);
  assertMountGeometry();
  assert.ok(
    slidersOf('a').every((s) => Math.abs(s.position.z - 0.005) < 1e-9),
    '12 mm thickness drives all four sliders to offset +5 mm',
  );
  assert.equal(store.patchItem('a', { exhibitMm: 99 }), false);
  assert.equal(
    store.getSnapshot().items.find((a) => a.id === 'a').exhibitMm,
    12,
    'out-of-range thickness is rejected and state is unchanged',
  );
  assert.match(store.getSnapshot().toast, /1–12/);
  assert.equal(store.patchItem('a', { exhibitMm: 6 }), true);
  assertMountGeometry();
  assert.ok(
    slidersOf('a').every((s) => Math.abs(s.position.z + 0.001) < 1e-9),
    'sliders return to offset -1 mm after restoring the 6 mm thickness',
  );
  // 非夹持模块（如灯具）的派生节点滑块收回为完整立方体。
  const lampSliders = slidersOf(
    store.getSnapshot().items.find((a) => a.type === 'lamp')?.id ?? '',
  );
  if (lampSliders.length)
    assert.ok(
      lampSliders.every(
        (s) => Math.abs(s.position.z + 0.007) < 1e-9 && s.userData.slider.retract === true,
      ),
      'non-exhibit derived nodes keep the slider fully retracted',
    );
}
store.setExhibition(2);
// 完成切换动画后再核验，旧模型应退出场景。
for (let i = 0; i < 150; i++) frames.get(1)();
assertMountGeometry();
store.setView('front');
engine.resetView();
assert.match(engine.snapshot(), /^data:image\/png/);
engine.destroy();
assert.equal(stage.querySelectorAll('canvas').length, 0);
assert.equal(frames.size, 0);
assert.equal(observing, false);
assert.equal(renderer.disposed, true);

assert.match(generatePreview(store.getSnapshot().items), /^data:image\/png/);
assert.equal(globalThis.__renderer.contextLost, true);
assert.equal(document.querySelectorAll('canvas').length, 0);
globalThis.__gpuFailure = new Error('WebGL context unavailable');
assert.throws(() => createPlannerScene(stage, store), /WebGL context unavailable/);
assert.equal(stage.querySelectorAll('canvas').length, 0);
assert.equal(frames.size, 0);
delete globalThis.__gpuFailure;
store.destroy();
dom.window.close();
console.log('Scene lifecycle: real initialization, resize handles, preview and cleanup passed.');
