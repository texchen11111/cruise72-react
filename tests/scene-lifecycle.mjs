import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { createPlannerStore } from '../src/store/index.js';

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
  observe() { observing = true; }
  disconnect() { observing = false; }
};

const result = await build({
  entryPoints: ['src/scene/createPlannerScene.js'],
  bundle: true,
  format: 'esm',
  write: false,
  plugins: [{
    name: 'gpu-boundary',
    setup(build) {
      build.onResolve({ filter: /^three$/ }, () => ({ path: 'three', namespace: 'gpu' }));
      build.onResolve({ filter: /^three\/addons\/OrbitControls\.js$/ }, () => ({
        path: 'orbit', namespace: 'gpu',
      }));
      build.onLoad({ filter: /.*/, namespace: 'gpu' }, ({ path }) => ({
        resolveDir: process.cwd(),
        contents: path === 'orbit' ? `
          import { Vector3 } from './vendor/three.module.js';
          export class OrbitControls {
            target = new Vector3();
            update() {}
            dispose() {}
          }
        ` : `
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
  }],
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
assert.deepEqual(handles().map((h) => h.userData.resizeHandle.axis), ['x', 'y', 'z']);
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
