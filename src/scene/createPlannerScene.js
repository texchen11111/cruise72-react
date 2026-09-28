import * as THREE from 'three';
import { ORIGIN, PITCH, envelope, position, cells } from '../model/index.js';
import { createMaterials } from './materials.js';
import { createModuleBuilder } from './moduleGeometry.js';
import { createEnvironment } from './environment.js';
import { setupPointer } from './pointer.js';
import { createAnimation } from './animation.js';

// Own the scene lifecycle; keep the deployed geometry, previews and transitions.
export function createPlannerScene(stage, store, options = {}) {
  const initial = store.getSnapshot();
  const ctx = {
    stage,
    items: initial.items,
    selected: initial.selected,
    night: initial.night,
    view: initial.view,
    models: new Map(),
    exiting: [],
    materials: createMaterials(),
    resizeHandles: new THREE.Group(),
  };
  let frame = 0,
    observer = null,
    unsubscribe = () => {},
    revision = initial.sceneRevision,
    viewRevision = initial.viewRevision;
  const listeners = [];
  ctx.listen = (target, event, callback) => {
    target.addEventListener(event, callback);
    listeners.push(() => target.removeEventListener(event, callback));
  };
  const builder = createModuleBuilder(ctx);
  ctx.buildModule = builder.buildModule;
  ctx.dispose = builder.dispose;
  ctx.updateSelection = updateSelection;
  const environment = createEnvironment(ctx, stage, options);
  const animation = createAnimation(ctx);
  function rebuild(a) {
    builder.dispose(ctx.models.get(a.id));
    builder.buildModule(a);
    updateSelection();
  }
  function animate() {
    frame = requestAnimationFrame(animate);
    animation.update();
  }
  function updateSelection() {
    if (!ctx.selectionBox) return;
    const a = ctx.items.find((x) => x.id === ctx.selected);
    ctx.selectionBox.visible = !!a;
    while (ctx.resizeHandles.children.length) {
      const h = ctx.resizeHandles.children.pop();
      h.geometry?.dispose();
      h.material?.dispose();
    }
    if (a) {
      const e = envelope(a);
      ctx.selectionBox.box.min.set(...e.min.map((v, i) => v * PITCH + ORIGIN[i]));
      ctx.selectionBox.box.max.set(...e.max.map((v, i) => v * PITCH + ORIGIN[i]));
      const box = new THREE.BoxGeometry(0.032, 0.032, 0.032);
      for (const [axis, p, color] of [
        ['x', [e.max[0], (e.min[1] + e.max[1]) / 2, e.min[2]], '#3158e8'],
        ['y', [(e.min[0] + e.max[0]) / 2, e.max[1], e.min[2]], '#ed8e40'],
        ['z', [(e.min[0] + e.max[0]) / 2, e.min[1], e.max[2]], '#5b8def'],
      ]) {
        const h = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color }));
        h.position.set(...p.map((v, i) => v * PITCH + ORIGIN[i]));
        h.userData.resizeHandle = { id: a.id, axis };
        ctx.resizeHandles.add(h);
      }
      ctx.resizeHandles.visible = true;
    } else ctx.resizeHandles.visible = false;
  }
  function sync() {
    const s = store.getSnapshot();
    ctx.items = s.items;
    ctx.selected = s.selected;
    ctx.night = s.night;
    const switching = revision !== s.sceneRevision;
    revision = s.sceneRevision;
    for (const [id, g] of ctx.models)
      if (!ctx.items.some((a) => a.id === id && a.type === g.userData.type)) {
        if (switching) ctx.exiting.push(g);
        else builder.dispose(g);
        ctx.models.delete(id);
      }
    for (const a of ctx.items) {
      const g = ctx.models.get(a.id);
      if (!g) {
        const n = builder.buildModule(a);
        if (switching) {
          n.scale.setScalar(0.02);
          n.userData.transition = true;
        }
      } else {
        const nextPosition = position(a);
        g.position.set(...nextPosition);
        if (g.userData.color !== a.color || g.userData.sizeKey !== cells(a).join('x')) rebuild(a);
        if (switching) ctx.models.get(a.id).userData.transition = true;
      }
    }
    if (ctx.dimensionGroup) ctx.dimensionGroup.visible = s.showDims;
    if (viewRevision !== s.viewRevision) {
      environment.setView(s.view);
      viewRevision = s.viewRevision;
    }
    updateSelection();
  }
  function destroy() {
    cancelAnimationFrame(frame);
    observer?.disconnect();
    unsubscribe();
    listeners.forEach((fn) => fn());
    ctx.orbit?.dispose();
    const geometries = new Set(),
      materials = new Set(),
      textures = new Set();
    ctx.scene?.traverse((o) => {
      if (o.geometry) geometries.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        if (m) {
          materials.add(m);
          if (m.map) textures.add(m.map);
        }
    });
    geometries.forEach((g) => g.dispose());
    textures.forEach((t) => t.dispose());
    materials.forEach((m) => m.dispose());
    ctx.studioEnvironment?.dispose();
    ctx.renderer?.dispose();
    if (options.preview) ctx.renderer?.forceContextLoss();
    ctx.renderer?.domElement.remove();
    ctx.models.clear();
  }

  try {
    environment.init();
    environment.scene.add(ctx.resizeHandles);
    if (!options.preview) {
      builder.buildProps();
      for (const a of ctx.items) builder.buildModule(a);
      updateSelection();
      observer = new ResizeObserver(environment.resize);
      observer.observe(stage);
      environment.resize();
      setupPointer(ctx, store);
      animate();
      unsubscribe = store.subscribe(sync);
    }
  } catch (error) {
    destroy();
    throw error;
  }
  return {
    resetView: () => environment.setView(store.getSnapshot().view),
    snapshot: () => {
      ctx.renderer.render(ctx.scene, ctx.camera);
      return ctx.renderer.domElement.toDataURL('image/png');
    },
    destroy,
  };
}

// Reuse the exact planner geometry for catalogue and preset images. No second model library.
export function generatePreview(items, width = 280, height = 180) {
  const stage = document.createElement('div');
  stage.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;height:${height}px`;
  document.body.append(stage);
  let engine;
  try {
    engine = createPlannerScene(
      stage,
      {
        getSnapshot: () => ({ items, selected: null, night: false, view: '3d' }),
        subscribe: () => () => {},
      },
      { preview: true },
    );
    return engine.snapshot();
  } finally {
    engine?.destroy();
    stage.remove();
  }
}
