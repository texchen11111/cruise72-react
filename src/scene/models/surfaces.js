import * as THREE from 'three';
import { cube, cylinder } from '../primitives.js';

export function buildSurface(g, type, w, h, d, materials) {
  const { colored, white, silver, dark, orange } = materials;
  if (type === 'pegboard') {
    cube(g, w, h, 0.012, 0, 0, 0.006, white);
    for (let x = -w / 2 + 0.024; x < w / 2; x += 0.048)
      for (let y = -h / 2 + 0.024; y < h / 2; y += 0.048)
        cylinder(g, 0.004, 0.014, x, y, 0.014, dark, 'z');
  } else if (type === 'mesh') {
    const wire = new THREE.LineBasicMaterial({ color: '#7d8790', transparent: true, opacity: 0.9 });
    for (let x = -w / 2; x <= w / 2; x += 0.048) {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, -h / 2, 0.012), new THREE.Vector3(x, h / 2, 0.012)]);
      g.add(new THREE.Line(geo, wire));
    }
    for (let y = -h / 2; y <= h / 2; y += 0.048) {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-w / 2, y, 0.012), new THREE.Vector3(w / 2, y, 0.012)]);
      g.add(new THREE.Line(geo, wire));
    }
  } else if (type === 'metal') {
    cube(g, w, h, Math.max(d, 0.008), 0, 0, 0.008, silver);
    cube(g, w - 0.018, h - 0.018, 0.002, 0, 0, 0.014, colored);
  } else if (type === 'rope') {
    const rope = new THREE.LineBasicMaterial({ color: '#b88756' });
    for (let x = -w / 2; x <= w / 2; x += 0.096) {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, -h / 2, 0.01), new THREE.Vector3(x, h / 2, 0.01)]);
      g.add(new THREE.Line(geo, rope));
    }
    for (let y = -h / 2; y <= h / 2; y += 0.096) {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-w / 2, y, 0.01), new THREE.Vector3(w / 2, y, 0.01)]);
      g.add(new THREE.Line(geo, rope));
    }
  }
}
