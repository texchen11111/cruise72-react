import * as THREE from 'three';
import { cube, cylinder } from '../primitives.js';

// 把 w×h 的薄板按挂点缺口（节点 48×48 装配区）分解为实心矩形列表，
// 使前压板、导柱有真实装配空间，而不是与板面互相穿透。
export function rectsMinusHoles(w, h, holes) {
  if (!holes.length) return [{ x0: -w / 2, y0: -h / 2, x1: w / 2, y1: h / 2 }];
  const ys = [...new Set([-h / 2, h / 2, ...holes.flatMap((r) => [r.y0, r.y1])])].sort(
    (a, b) => a - b,
  );
  const rects = [];
  for (let i = 0; i < ys.length - 1; i++) {
    const y0 = ys[i],
      y1 = ys[i + 1];
    if (y1 - y0 < 1e-9) continue;
    const active = holes.filter((r) => r.y0 <= y0 && r.y1 >= y1).sort((a, b) => a.x0 - b.x0);
    let cursor = -w / 2;
    for (const hole of active) {
      if (hole.x0 > cursor) rects.push({ x0: cursor, y0, x1: hole.x0, y1 });
      cursor = Math.max(cursor, hole.x1);
    }
    if (cursor < w / 2) rects.push({ x0: cursor, y0, x1: w / 2, y1 });
  }
  return rects;
}

const inHole = (x, y, holes) => holes.some((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1);

// backZ：薄板背面在模块坐标系中的位置（机械层：锚点 + jawBack，见 clamp.js）。
export function buildSurface(g, type, w, h, d, materials, { backZ = 0, holes = [] } = {}) {
  const { colored, white, silver, dark } = materials;
  if (type === 'pegboard') {
    for (const r of rectsMinusHoles(w, h, holes)) {
      const rw = r.x1 - r.x0,
        rh = r.y1 - r.y0;
      cube(g, rw, rh, 0.006, (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, backZ + 0.003, white);
    }
    for (let x = -w / 2 + 0.024; x < w / 2; x += 0.048)
      for (let y = -h / 2 + 0.024; y < h / 2; y += 0.048)
        if (!inHole(x, y, holes)) cylinder(g, 0.004, 0.014, x, y, backZ + 0.012, dark, 'z');
  } else if (type === 'mesh') {
    const wire = new THREE.LineBasicMaterial({ color: '#7d8790', transparent: true, opacity: 0.9 });
    for (let x = -w / 2; x <= w / 2; x += 0.048) {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, -h / 2, backZ + 0.003), new THREE.Vector3(x, h / 2, backZ + 0.003)]);
      g.add(new THREE.Line(geo, wire));
    }
    for (let y = -h / 2; y <= h / 2; y += 0.048) {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-w / 2, y, backZ + 0.003), new THREE.Vector3(w / 2, y, backZ + 0.003)]);
      g.add(new THREE.Line(geo, wire));
    }
  } else if (type === 'metal') {
    const depth = Math.max(d, 0.008);
    for (const r of rectsMinusHoles(w, h, holes)) {
      const rw = r.x1 - r.x0,
        rh = r.y1 - r.y0;
      cube(g, rw, rh, depth, (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, backZ + depth / 2, silver);
      const inset = 0.009;
      if (rw > inset * 2 && rh > inset * 2)
        cube(
          g,
          rw - inset * 2,
          rh - inset * 2,
          0.002,
          (r.x0 + r.x1) / 2,
          (r.y0 + r.y1) / 2,
          backZ + depth + 0.001,
          colored,
        );
    }
  } else if (type === 'rope') {
    const rope = new THREE.LineBasicMaterial({ color: '#b88756' });
    for (let x = -w / 2; x <= w / 2; x += 0.096) {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, -h / 2, backZ + 0.003), new THREE.Vector3(x, h / 2, backZ + 0.003)]);
      g.add(new THREE.Line(geo, rope));
    }
    for (let y = -h / 2; y <= h / 2; y += 0.096) {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-w / 2, y, backZ + 0.003), new THREE.Vector3(w / 2, y, backZ + 0.003)]);
      g.add(new THREE.Line(geo, rope));
    }
  }
}
