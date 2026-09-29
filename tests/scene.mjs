import assert from 'node:assert/strict';
import { build } from 'esbuild';
import path from 'node:path';
import { MODULES, position } from '../src/model/index.js';

// Exercise real Three.js geometry and animation without requiring a GPU.
const result = await build({
  stdin: {
    contents: `
      export * as THREE from 'three';
      export {createMaterials} from './src/scene/materials.js';
      export {createModuleBuilder} from './src/scene/moduleGeometry.js';
      export {createAnimation} from './src/scene/animation.js';
      export {setupPointer} from './src/scene/pointer.js';
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'esm',
  write: false,
  alias: { three: path.resolve('vendor/three.module.js') },
});
const { THREE, createMaterials, createModuleBuilder, createAnimation, setupPointer } = await import(
  'data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64')
);

globalThis.document = {
  createElement: () => ({
    getContext: () => ({
      fillRect() {},
      fillText() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
    }),
  }),
};
let renders = 0;
const ctx = {
  materials: createMaterials(),
  models: new Map(),
  scene: new THREE.Scene(),
  items: Object.keys(MODULES).map((type) => ({
    id: type,
    type,
    gx: 0,
    gy: 0,
    gz: 0,
    state: 0,
    color: '#3158e8',
    intensity: 65,
    temperature: 3200,
  })),
  exiting: [],
  night: true,
  ambient: { intensity: 1.8 },
  sun: { intensity: 2.5 },
  orbit: { enabled: true, update() {} },
  renderer: {
    render() {
      renders++;
    },
  },
  camera: new THREE.PerspectiveCamera(40, 1, 0.01, 80),
  selectionBox: { material: { color: new THREE.Color() } },
  updateSelection() {},
};
ctx.scene.background = new THREE.Color('#e9e7e1');
const builder = createModuleBuilder(ctx);
ctx.dispose = builder.dispose;
for (const item of ctx.items) {
  const group = builder.buildModule(item);
  assert.deepEqual(group.position.toArray(), position(item));
  assert.equal(group.userData.type, item.type);
  let meshes = 0;
  group.traverse((object) => {
    if (object.isMesh || object.isLine) {
      meshes++;
      if (object.isMesh) assert.equal(object.userData.itemId, item.id);
    }
  });
  assert.ok(meshes > 0, item.type);
}
assert.equal(ctx.models.size, 17);
assert.equal(builder.buildProps, undefined, 'decorative rails are removed');
assert.equal(ctx.scene.children.length, 17, 'only real module groups, no extra rails');
ctx.items = ctx.items.map((item) => ({ ...item, state: 1 }));
const animation = createAnimation(ctx);
animation.update();
assert.equal(renders, 1);
assert.ok(ctx.models.get('cabinet').userData.act.rotation.y < 0);
assert.ok(ctx.models.get('lamp').userData.light.intensity > 0);
assert.ok(ctx.models.get('scent').userData.particles.every((p) => p.visible));
assert.equal(ctx.models.get('bookrest').userData.book.visible, false);
assert.ok(ctx.ambient.intensity < 1.8);

// A new snapshot must be consumed by the existing animation instance.
const block = ctx.models.get('block');
const startX = block.position.x;
block.userData.transition = true;
block.scale.setScalar(0.02);
ctx.items = ctx.items.map((item) => ({ ...item, gx: item.gx + 2, state: 0 }));
animation.update();
assert.ok(block.position.x > startX);
assert.ok(block.scale.x > 0.02 && block.scale.x < 1);
assert.equal(ctx.models.get('bookrest').userData.book.visible, true);
assert.ok(ctx.models.get('scent').userData.particles.every((p) => !p.visible));
const removed = ctx.models.get('tray');
ctx.items = ctx.items.filter((item) => item.id !== 'tray');
ctx.models.delete('tray');
removed.scale.setScalar(0.01);
ctx.exiting.push(removed);
animation.update();
assert.equal(ctx.exiting.length, 0);
assert.equal(removed.parent, null);

class Target extends EventTarget {
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 200, height: 200 };
  }
}
ctx.stage = new Target();
ctx.renderer.domElement = new Target();
ctx.camera.position.set(0, 1, 5);
ctx.camera.updateMatrixWorld();
const cleanup = [];
ctx.listen = (target, event, fn) => {
  target.addEventListener(event, fn);
  cleanup.push(() => target.removeEventListener(event, fn));
};
let added = null;
setupPointer(ctx, {
  addItem: (...args) => {
    added = args;
  },
});
const drop = () => {
  const event = new Event('drop', { cancelable: true });
  Object.assign(event, {
    clientX: 100,
    clientY: 100,
    dataTransfer: { getData: () => 'block' },
  });
  ctx.stage.dispatchEvent(event);
  return event;
};
assert.equal(drop().defaultPrevented, true);
assert.equal(added[0], 'block');
assert.ok(Number.isInteger(added[1]));
cleanup.forEach((fn) => fn());
added = null;
assert.equal(drop().defaultPrevented, false);
assert.equal(added, null);
// 正视图的深度拖动必须改变尺寸，不能用固定 Z 平面上恒为零的差值。
ctx.resizeHandles = new THREE.Group();
const depthHandle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2));
depthHandle.position.set(0, 1, 0);
depthHandle.userData.resizeHandle = { id: 'panel', axis: 'z' };
ctx.resizeHandles.add(depthHandle);
ctx.resizeHandles.updateMatrixWorld(true);
ctx.renderer.domElement.setPointerCapture = () => {};
let resized = null;
let committed = false;
cleanup.length = 0;
setupPointer(ctx, {
  select() {},
  resizeItem(id, size, commit) {
    resized = { id, size, commit };
    return true;
  },
  changed() {
    committed = true;
  },
});
for (const [type, y] of [
  ['pointerdown', 100],
  ['pointermove', 76],
  ['pointerup', 76],
]) {
  const event = new Event(type);
  Object.assign(event, { button: 0, pointerId: 1, clientX: 100, clientY: y });
  ctx.renderer.domElement.dispatchEvent(event);
}
assert.deepEqual(resized, { id: 'panel', size: [15, 12, 3], commit: false });
assert.equal(committed, true, '一次拖动在释放时提交');
cleanup.forEach((fn) => fn());
let sharedDisposed = false;
ctx.materials.shared.silver.addEventListener('dispose', () => {
  sharedDisposed = true;
});
builder.dispose(ctx.models.get('cabinet'));
assert.equal(sharedDisposed, false, 'shared materials survive individual module removal');
console.log(
  'Scene: 17 real geometries, live animation, transitions, book state, drop and cleanup passed.',
);
