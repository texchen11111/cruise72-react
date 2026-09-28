import * as THREE from 'three';
import { MODULES as M, position, cells, mountPoints } from '../model/index.js';
import { cube, cylinder } from './primitives.js';
import { buildRhinoPillar, buildRhinoNode } from './models/rhino.js';
import { buildSurface } from './models/surfaces.js';

export function createModuleBuilder(ctx) {
  const { mat, textTexture, shared } = ctx.materials;
  const { silver, orange, dark, white, glass } = shared;
  function node(g, x, y, co, nodeId) {
    const connector = new THREE.Group();
    connector.position.set(x, y, 0);
    connector.userData.mountNodeId = nodeId;
    buildRhinoNode(connector, 0.048, 0.048, 0.048, silver, mat(co), dark);
    g.add(connector);
  }

  function buildModule(a) {
    if (!ctx.scene) return;
    const m = M[a.type],
      g = new THREE.Group(),
      colored = mat(a.color),
      [w, h, d] = cells(a).map((v) => v * 0.048);
    g.userData.id = a.id;
    g.position.set(...position(a));
    let act = null;
    if (a.type === 'pillar') buildRhinoPillar(g, w, h, d, silver, dark);
    else if (a.type === 'block') buildRhinoNode(g, w, h, d, silver, orange, dark);
    else if (['pegboard', 'mesh', 'metal', 'rope'].includes(a.type)) buildSurface(g, a.type, w, h, d, { colored, white, silver, dark, orange });
    else if (a.type === 'panel' || a.type === 'acoustic' || a.type === 'sign') {
      const depth = a.type === 'panel' ? 0.006 : 0.025;
      cube(g, w, h, depth, 0, 0, 0.025, a.type === 'acoustic' ? mat('#829f9e') : white);
      if (a.type !== 'acoustic') {
        const front = new THREE.Mesh(
          new THREE.PlaneGeometry(w - 0.012, h - 0.012),
          textTexture(a.type === 'sign' ? 'WELCOME' : 'ON THE OCEAN', '72+ / 48 mm system'),
        );
        front.position.set(0, 0, 0.025 + depth / 2 + 0.001);
        g.add(front);
      } else
        for (let i = 1; i < 14; i++)
          cube(g, 0.002, h - 0.02, 0.002, -w / 2 + i * 0.048, 0, 0.039, dark);
    } else if (a.type === 'cabinet') {
      cube(g, w, 0.012, d, 0, -h / 2 + 0.006, d / 2, colored);
      cube(g, w, 0.012, d, 0, h / 2 - 0.006, d / 2, colored);
      for (const x of [-w / 2 + 0.006, w / 2 - 0.006]) cube(g, 0.012, h, d, x, 0, d / 2, colored);
      cube(g, w, h, 0.008, 0, 0, 0.004, white);
      cube(g, w - 0.03, 0.006, d - 0.04, 0, -0.025, d / 2, glass);
      cube(g, 0.12, 0.04, 0.12, -0.15, -h / 2 + 0.032, d / 2, white);
      cylinder(g, 0.035, 0.09, -0.15, -h / 2 + 0.097, d / 2, orange);
      cube(g, 0.1, 0.13, 0.08, 0.14, 0.043, d / 2, white);
      act = new THREE.Group();
      act.position.set(-w / 2 + 0.008, 0, d - 0.008);
      cube(act, w - 0.016, h - 0.03, 0.006, (w - 0.016) / 2, 0, 0, glass);
      cube(act, 0.008, 0.07, 0.008, w - 0.05, 0, 0.005, silver);
      g.add(act);
    } else if (a.type === 'shelf') {
      cube(g, w, 0.02, d, 0, -h / 2 + 0.01, d / 2, colored);
      cube(g, w, 0.03, 0.01, 0, -h / 2 + 0.035, d - 0.005, colored);
      for (const x of [-w / 2 + 0.025, w / 2 - 0.025])
        cube(g, 0.025, h - 0.02, 0.025, x, 0.01, 0.015, silver);
      for (let i = 0; i < 3; i++)
        cube(
          g,
          0.085,
          0.014,
          0.15,
          -0.16 + i * 0.09,
          -h / 2 + 0.027,
          d / 2,
          i === 1 ? orange : white,
        );
    } else if (a.type === 'lamp') {
      cube(g, 0.048, 0.096, 0.016, 0, 0, 0.008, colored);
      cylinder(g, 0.012, 0.09, 0, 0, 0.06, silver, 'z');
      const hinge = new THREE.Group();
      hinge.position.set(0, 0, 0.135);
      hinge.rotation.x = Math.PI / 4;
      cylinder(hinge, 0.04, 0.065, 0, 0, 0, colored, 'z');
      const disk = cylinder(
        hinge,
        0.034,
        0.003,
        0,
        0,
        0.034,
        new THREE.MeshStandardMaterial({
          color: '#fff4d0',
          emissive: '#ffd08a',
          emissiveIntensity: 1,
        }),
        'z',
      );
      g.add(hinge);
      const light = new THREE.SpotLight('#ffd08a', 0, 2.8, 0.6, 0.8, 1.4);
      light.position.set(0, -0.02, 0.16);
      light.target.position.set(0, -0.65, 0.03);
      g.add(light, light.target);
      g.userData.light = light;
      g.userData.disk = disk;
    } else if (a.type === 'scent') {
      cube(g, w, h, d, 0, 0, d / 2, colored);
      cube(g, w - 0.024, h * 0.55, 0.004, 0, -0.03, d - 0.001, white);
      for (let i = 0; i < 5; i++)
        cube(g, w - 0.04, 0.003, 0.002, 0, h / 2 - 0.02 - i * 0.009, d - 0.001, dark);
      g.userData.particles = [];
      const pm = new THREE.MeshBasicMaterial({ color: '#78c5cd', transparent: true, opacity: 0.5 });
      for (let i = 0; i < 10; i++) {
        const q = new THREE.Mesh(new THREE.SphereGeometry(0.003, 6, 6), pm);
        g.add(q);
        g.userData.particles.push(q);
      }
    } else if (a.type === 'rail') {
      cube(g, w - 0.048, 0.016, 0.016, 0, 0, 0.024, silver);
    } else if (a.type === 'tray') {
      cube(g, w, 0.012, d, 0, -h / 2 + 0.006, d / 2, white);
      for (const x of [-w / 2 + 0.006, w / 2 - 0.006])
        cube(g, 0.012, 0.038, d, x, -h / 2 + 0.025, d / 2, colored);
      cube(g, w, 0.038, 0.012, 0, -h / 2 + 0.025, d - 0.006, colored);
      for (const x of [-w / 2 + 0.024, w / 2 - 0.024])
        cube(g, 0.016, 0.016, d - 0.048, x, -h / 2 + 0.03, d / 2 + 0.024, silver);
      for (let i = 0; i < 3; i++)
        cube(
          g,
          0.085,
          0.018,
          0.095,
          -0.16 + i * 0.16,
          -h / 2 + 0.023,
          d / 2,
          i === 1 ? orange : white,
        );
    } else if (a.type === 'bookrest') {
      const face = new THREE.Group();
      face.rotation.x = -Math.PI / 6;
      face.position.set(0, 0, 0.12);
      cube(face, w, 0.34, 0.012, 0, 0, 0, white);
      cube(face, w, 0.025, 0.04, 0, -0.16, 0.014, colored);
      const book = new THREE.Group();
      cube(book, w - 0.065, 0.29, 0.012, 0, 0, 0.012, white);
      const page = new THREE.Mesh(
        new THREE.PlaneGeometry(w - 0.08, 0.275),
        textTexture('VOYAGE / 72', 'Collected places · Open to explore'),
      );
      page.position.z = 0.019;
      book.add(page);
      face.add(book);
      g.userData.book = book;
      g.add(face);
      for (const x of [-w / 2 + 0.024, w / 2 - 0.024])
        cube(g, 0.018, 0.018, 0.19, x, -0.13, 0.13, silver);
    } else if (a.type === 'worktop') {
      // Reserved 480 mm height/depth contains every intermediate fold angle.
      act = new THREE.Group();
      act.position.set(0, -h / 2 + 0.03, 0.02);
      cube(act, w, 0.022, 0.432, 0, 0, 0.216, colored);
      cube(act, w, 0.008, 0.008, 0, 0.015, 0.426, colored);
      for (const x of [-w / 2 + 0.025, w / 2 - 0.025])
        cube(g, 0.025, h, 0.018, x, 0, 0.009, silver);
      g.add(act);
    }
    if (m.mount > 0 && a.type !== 'block') {
      const connections = mountPoints(a, ctx.items);
      const [cx, cy] = position(a);
      const points = connections.length ? connections.map((n) => ({
        x: -1.44 + (n.gx + 0.5) * 0.048 - cx,
        y: 0.01 + (n.gy + 0.5) * 0.048 - cy,
        id: n.id,
      })) : (m.mount === 4 || a.type === 'rail'
        ? [-w / 2 + 0.024, w / 2 - 0.024] : [-w / 2 + 0.024])
        .flatMap((x) => (a.type === 'rail' ? [0] : [-h / 2 + 0.024, h / 2 - 0.024])
          .map((y) => ({ x, y })));
      for (const p of points) {
        if (p.id !== a.parentId || !ctx.items.some((n) => n.id === p.id)) {
          node(g, p.x, p.y, a.color, p.id);
        }
      }
      if (m.mount === 4) {
        const xs = points.map((p) => p.x);
        const min = Math.min(...xs), max = Math.max(...xs);
        for (const y of [...new Set(points.map((p) => p.y))]) {
          cube(g, max - min, 0.012, 0.012, (min + max) / 2, y, 0.018, silver);
        }
      }
    }
    g.userData.act = act;
    if (act) {
      if (a.type === 'worktop') act.rotation.x = a.state ? 0 : -Math.PI / 2;
      if (a.type === 'cabinet') act.rotation.y = a.state ? -Math.PI / 2 : 0;
    }
    g.traverse((o) => {
      if (o.isMesh) o.userData.itemId = a.id;
    });
    ctx.scene.add(g);
    g.userData.type = a.type;
    g.userData.color = a.color;
    g.userData.sizeKey = geometryKey(a, ctx.items);
    ctx.models.set(a.id, g);
    return g;
  }

  function dispose(g) {
    if (!g) return;
    ctx.scene.remove(g);
    g.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (
        o.material &&
        !Object.values({ silver, orange, dark, white, glass }).includes(o.material)
      ) {
        o.material.map?.dispose();
        o.material.dispose();
      }
    });
  }
  return { buildModule, dispose };
}

export function geometryKey(a, items) {
  return JSON.stringify([cells(a), mountPoints(a, items).map((n) => [
    n.id, n.gx - a.gx, n.gy - a.gy, n.gz - a.gz,
  ])]);
}
