import * as THREE from 'three';
import { MODULES as M, ORIGIN, PITCH } from '../model/index.js';
import { cells } from '../model/index.js';

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
    const handleHit = ray.intersectObjects(
      ctx.resizeHandles ? [...ctx.resizeHandles.children] : [],
      false,
    )[0];
    if (handleHit?.object.userData.resizeHandle) {
      const { id, axis } = handleHit.object.userData.resizeHandle;
      const a = ctx.items.find((x) => x.id === id);
      if (!a) return;
      store.select(id);
      plane.constant = -a.gz * PITCH;
      const start = point(e);
      if (!start) return;
      drag = {
        kind: 'resize',
        id,
        axis,
        start,
        a: { ...a, sizeCells: cells(a) },
        px: e.clientX,
        py: e.clientY,
        moved: false,
        blocked: false,
      };
      if (axis === 'z') {
        const origin = handleHit.object.position.clone().project(ctx.camera);
        const end = handleHit.object.position.clone();
        end.z += PITCH;
        end.project(ctx.camera);
        const rect = canvas.getBoundingClientRect();
        drag.depthAxis = [
          ((end.x - origin.x) * rect.width) / 2,
          (-(end.y - origin.y) * rect.height) / 2,
        ];
        // 正视图的深度轴投影为点，改用向上拖动增加深度。
        if (Math.hypot(...drag.depthAxis) < 2) drag.depthAxis = [0, -12];
      }
      ctx.orbit.enabled = false;
      canvas.setPointerCapture(e.pointerId);
      return;
    }
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
      resize = drag.kind === 'resize';
    if (resize) {
      const next = [...drag.a.sizeCells];
      const index = { x: 0, y: 1, z: 2 }[drag.axis];
      let delta;
      if (drag.axis === 'z') {
        const [dx, dy] = drag.depthAxis;
        delta = Math.round(
          ((e.clientX - drag.px) * dx + (e.clientY - drag.py) * dy) / (dx * dx + dy * dy),
        );
      } else {
        delta = Math.round((p[drag.axis] - drag.start[drag.axis]) / PITCH);
      }
      next[index] = Math.max(1, drag.a.sizeCells[index] + delta);
      drag.blocked = !store.resizeItem(a.id, next, false);
      ctx.selectionBox.material.color.set(drag.blocked ? '#e25743' : '#3158e8');
      if (!drag.blocked) {
        drag.moved = true;
      }
      return;
    }
    const test = {
      ...a,
      gx: drag.a.gx + Math.round((p.x - drag.start.x) / PITCH),
      gy: drag.a.gy + Math.round((p.y - drag.start.y) / PITCH),
    };
    drag.blocked = !store.moveItem(a.id, { gx: test.gx, gy: test.gy }, false);
    ctx.selectionBox.material.color.set(drag.blocked ? '#e25743' : '#3158e8');
    if (!drag.blocked) {
      drag.moved = true;
    }
  });
  const release = () => {
    if (drag?.moved) {
      if (drag.kind === 'resize') {
        store.changed();
      } else {
        // 以提交模式重放最终格位：触发父子归一（拓展→节点、节点→梯柱）。
        const a = ctx.items.find((x) => x.id === drag.id);
        if (a) store.moveItem(a.id, { gx: a.gx, gy: a.gy, gz: a.gz }, true);
      }
    }
    if (drag?.blocked) store.toast('该位置无法挂接、超界或重叠，保留上一个可用格位');
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
