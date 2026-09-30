import * as THREE from 'three';

export function cube(g, w, h, d, x, y, z, m) {
  const q = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  q.position.set(x, y, z);
  q.castShadow = true;
  q.receiveShadow = true;
  g.add(q);
  return q;
}

export function cylinder(g, r, h, x, y, z, m, axis = 'y') {
  const q = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), m);
  q.position.set(x, y, z);
  if (axis === 'x') q.rotation.z = Math.PI / 2;
  if (axis === 'z') q.rotation.x = Math.PI / 2;
  q.castShadow = true;
  g.add(q);
  return q;
}
