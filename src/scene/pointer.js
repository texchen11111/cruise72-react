import * as THREE from 'three';
import { MODULES as M, ORIGIN, PITCH, valid, conflict } from '../model/index.js';

export function setupPointer(ctx, store) {
  const { listen, stage } = ctx;
  const canvas = ctx.renderer.domElement,
    ray = new THREE.Raycaster(),
    ndc = new THREE.Vector2(),
    plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  let drag = null;
  const get = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, (-(e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, ctx.camera);
  };
  const point = (e) => {
    get(e);
    return ray.ray.intersectPlane(plane, new THREE.Vector3());
  };
  listen(canvas, 'pointerdown', (e) => {
    if (e.button !== 0) return;
    get(e);
    const hit = ray.intersectObjects([...ctx.models.values()], true)[0];
    if (!hit) return;
    const a = ctx.items.find((x) => x.id === hit.object.userData.itemId);
    if (!a) return;
    store.select(a.id);
    plane.constant = -a.gz * PITCH;
    const start = point(e);
    if (!start) return;
    drag = {
      id: a.id,
      start,
      a: { ...a },
      px: e.clientX,
      py: e.clientY,
      moved: false,
      blocked: false,
    };
    ctx.orbit.enabled = false;
    canvas.setPointerCapture(e.pointerId);
  });
  listen(canvas, 'pointermove', (e) => {
    if (!drag || Math.hypot(e.clientX - drag.px, e.clientY - drag.py) < 5) return;
    const p = point(e);
    if (!p) return;
    const a = ctx.items.find((x) => x.id === drag.id),
      test = {
        ...a,
        gx: drag.a.gx + Math.round((p.x - drag.start.x) / PITCH),
        gy: drag.a.gy + Math.round((p.y - drag.start.y) / PITCH),
      };
    drag.blocked = !valid(test) || !!conflict(test, ctx.items);
    ctx.selectionBox.material.color.set(drag.blocked ? '#e25743' : '#3158e8');
    if (!drag.blocked) {
      store.moveItem(a.id, { gx: test.gx, gy: test.gy }, false);
      drag.moved = true;
    }
  });
  const release = () => {
    if (drag?.moved) {
      store.changed();
    }
    if (drag?.blocked) store.toast('该位置超界或重叠，保留上一个可用格位');
    drag = null;
    ctx.orbit.enabled = true;
    ctx.selectionBox.material.color.set('#3158e8');
  };
  listen(canvas, 'pointerup', release);
  listen(canvas, 'pointercancel', release);
  listen(stage, 'dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  listen(stage, 'drop', (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('text/plain');
    if (!M[type]) return;
    plane.constant = 0;
    const p = point(e);
    if (!p) return;
    store.addItem(
      type,
      Math.round((p.x - ORIGIN[0]) / PITCH - M[type].cells[0] / 2),
      Math.round((p.y - ORIGIN[1]) / PITCH - M[type].cells[1] / 2),
      0,
      null,
      true,
    );
  });
}
