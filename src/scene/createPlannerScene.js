import * as THREE from 'three';
import { ORIGIN, PITCH, envelope, position } from '../model/index.js';
import { createMaterials } from './materials.js';
import { createEnvironment } from './environment.js';
import { createModuleBuilder } from './moduleGeometry.js';
import { setupPointer } from './pointer.js';

// Existing geometry, shading, camera and animation parameters are retained.
// React mounts this renderer once and disposes it on unmount.
// Assembly entry: shared state lives in ctx, and each scene module
// (materials / environment / module geometry / pointer) owns one duty.
export function createPlannerScene(stage, store) {
  const initial = store.getSnapshot();
  const ctx = {
    stage,
    store,
    items: initial.items,
    selected: initial.selected,
    night: initial.night,
    view: initial.view,
    models: new Map(),
    materials: createMaterials(),
    scene: null,
    renderer: null,
    camera: null,
    orbit: null,
    ambient: null,
    sun: null,
    selectionBox: null,
    dimensionGroup: null,
    listeners: [],
  };
  ctx.listen = (target, event, callback) => {
    target.addEventListener(event, callback);
    ctx.listeners.push(() => target.removeEventListener(event, callback));
  };
  const environment = createEnvironment(ctx, stage);
  const builder = createModuleBuilder(ctx);
  const clock = new THREE.Clock();
  let frame = 0;
  let observer = null;
  let unsubscribe = () => {};
  let revision = initial.sceneRevision;
  let viewRevision = initial.viewRevision;

  function updateSelection() {
    if (!ctx.selectionBox) return;
    const a = ctx.items.find((x) => x.id === ctx.selected);
    ctx.selectionBox.visible = !!a;
    if (a) {
      const e = envelope(a);
      ctx.selectionBox.box.min.set(...e.min.map((v, i) => v * PITCH + ORIGIN[i]));
      ctx.selectionBox.box.max.set(...e.max.map((v, i) => v * PITCH + ORIGIN[i]));
    }
  }

  function rebuild(a) {
    builder.dispose(ctx.models.get(a.id));
    builder.buildModule(a);
    updateSelection();
  }

  function animate() {
    frame = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    for (const a of ctx.items) {
      const g = ctx.models.get(a.id);
      if (!g) continue;
      g.position.set(...position(a));
      const act = g.userData.act;
      if (act) {
        if (a.type === 'cabinet')
          act.rotation.y = THREE.MathUtils.lerp(act.rotation.y, a.state ? -Math.PI / 2 : 0, 0.12);
        if (a.type === 'worktop')
          act.rotation.x = THREE.MathUtils.lerp(act.rotation.x, a.state ? 0 : -Math.PI / 2, 0.12);
      }
      if (g.userData.light) {
        const l = g.userData.light;
        l.intensity = THREE.MathUtils.lerp(l.intensity, a.state ? a.intensity * 0.017 : 0, 0.1);
        const color =
          a.temperature === 2700 ? '#ffbd67' : a.temperature === 3200 ? '#ffd794' : '#fff0d2';
        l.color.set(color);
        g.userData.disk.material.emissive.set(color);
        g.userData.disk.material.emissiveIntensity = a.state ? a.intensity / 55 : 0;
      }
      if (g.userData.particles) {
        g.userData.particles.forEach((p, i) => {
          p.visible = !!a.state;
          const ph = (t * 0.3 + i / 10) % 1;
          p.position.set(Math.sin(t + i) * 0.013, 0.12 + ph * 0.18, 0.144 + ph * 0.05);
        });
      }
    }
    ctx.ambient.intensity = THREE.MathUtils.lerp(
      ctx.ambient.intensity,
      ctx.night ? 0.52 : 2.5,
      0.04,
    );
    ctx.sun.intensity = THREE.MathUtils.lerp(ctx.sun.intensity, ctx.night ? 0.28 : 3, 0.04);
    const bg = new THREE.Color(ctx.night ? '#6b768b' : '#f0f2f5');
    ctx.scene.background.lerp(bg, 0.04);
    ctx.orbit.update();
    updateSelection();
    ctx.renderer.render(ctx.scene, ctx.camera);
  }

  function sync() {
    const s = store.getSnapshot();
    ctx.items = s.items;
    ctx.selected = s.selected;
    ctx.night = s.night;
    if (revision !== s.sceneRevision) {
      for (const g of ctx.models.values()) builder.dispose(g);
      ctx.models.clear();
      revision = s.sceneRevision;
    }
    for (const [id, g] of ctx.models)
      if (!s.items.some((a) => a.id === id)) {
        builder.dispose(g);
        ctx.models.delete(id);
      }
    for (const a of s.items) {
      const g = ctx.models.get(a.id);
      if (!g) builder.buildModule(a);
      else if (g.userData.color !== a.color) rebuild(a);
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
    ctx.listeners.forEach((fn) => fn());
    ctx.orbit?.dispose();
    const geometrySet = new Set();
    const materialSet = new Set();
    const textureSet = new Set();
    ctx.scene?.traverse((o) => {
      if (o.geometry) geometrySet.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        if (m) {
          materialSet.add(m);
          if (m.map) textureSet.add(m.map);
        }
    });
    geometrySet.forEach((g) => g.dispose());
    textureSet.forEach((t) => t.dispose());
    materialSet.forEach((m) => m.dispose());
    ctx.renderer?.dispose();
    ctx.renderer?.domElement.remove();
    ctx.models.clear();
  }

  try {
    environment.init();
    builder.buildProps();
    for (const a of ctx.items) builder.buildModule(a);
    observer = new ResizeObserver(environment.resize);
    observer.observe(stage);
    environment.resize();
    setupPointer(ctx, store);
    animate();
    unsubscribe = store.subscribe(sync);
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
