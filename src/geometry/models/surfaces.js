import * as THREE from 'three';
import { PITCH } from '../../core/index.js';
import { cube, cylinder } from '../primitives.js';

// backZ：薄板背面在模块坐标系中的位置（机械层：锚点 + jawBack，见 clamp.js）。
// 整板渲染：圆导柱穿角部孔、压板压在板正面（见图1），板面无需为节点开缺口。
export function buildSurface(g, type, w, h, d, materials, { backZ = 0 } = {}) {
  const { colored, white, silver, dark } = materials;
  if (type === 'pegboard') {
    cube(g, w, h, 0.006, 0, 0, backZ + 0.003, white);
    for (let x = -w / 2 + PITCH / 2; x < w / 2; x += PITCH)
      for (let y = -h / 2 + PITCH / 2; y < h / 2; y += PITCH)
        cylinder(g, 0.004, 0.014, x, y, backZ + 0.012, dark, 'z');
  } else if (type === 'mesh') {
    const wire = new THREE.LineBasicMaterial({
      color: '#7d8790',
      transparent: true,
      opacity: 0.9,
    });
    for (let x = -w / 2; x <= w / 2; x += PITCH) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, -h / 2, backZ + 0.003),
        new THREE.Vector3(x, h / 2, backZ + 0.003),
      ]);
      g.add(new THREE.Line(geo, wire));
    }
    for (let y = -h / 2; y <= h / 2; y += PITCH) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-w / 2, y, backZ + 0.003),
        new THREE.Vector3(w / 2, y, backZ + 0.003),
      ]);
      g.add(new THREE.Line(geo, wire));
    }
  } else if (type === 'metal') {
    const depth = Math.max(d, 0.008);
    cube(g, w, h, depth, 0, 0, backZ + depth / 2, silver);
    const inset = 0.009;
    cube(
      g,
      w - inset * 2,
      h - inset * 2,
      0.002,
      0,
      0,
      backZ + depth + 0.001,
      colored,
    );
  } else if (type === 'rope') {
    const rope = new THREE.LineBasicMaterial({ color: '#b88756' });
    for (let x = -w / 2; x <= w / 2; x += 2 * PITCH) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, -h / 2, backZ + 0.003),
        new THREE.Vector3(x, h / 2, backZ + 0.003),
      ]);
      g.add(new THREE.Line(geo, rope));
    }
    for (let y = -h / 2; y <= h / 2; y += 2 * PITCH) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-w / 2, y, backZ + 0.003),
        new THREE.Vector3(w / 2, y, backZ + 0.003),
      ]);
      g.add(new THREE.Line(geo, rope));
    }
  }
}
