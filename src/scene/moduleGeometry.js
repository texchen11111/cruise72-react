import * as THREE from 'three';
import {
  MODULES as M,
  PITCH,
  mountPoints,
  mountingKey,
  position,
  cells,
  CLAMP,
  isExhibitType,
  exhibitBackMm,
  rungSnapShiftMm,
} from '../model/index.js';
import { cube, cylinder } from './primitives.js';
import { buildRhinoPillar, buildRhinoNode } from './models/rhino.js';
import { buildSurface } from './models/surfaces.js';

const REF = CLAMP.referenceExhibitMm;
// 模块坐标系中薄板背面的 z：锚点（gz*48+24 mm）+ 软垫面前缘（展板背面贴合面）。
const exhibitBackZ = (a, gz) => (gz - a.gz) * PITCH + (CLAMP.anchorFromGridZMm + exhibitBackMm()) * 0.001;

export function createModuleBuilder(ctx) {
  const { mat, textTexture, shared } = ctx.materials;
  const { silver, orange, blue, dark, white, glass } = shared;
  const nodeMats = { silver, orange, blue, dark, white };
  // 派生/真实节点：Rhino 装配（背板 + 机芯 + 滑块），锚点携带挂点数据。
  // 夹持状态压板压在展板正面；未夹持（retract）收回为完整立方体。
  function node(g, x, y, z, { role, thicknessMm, retract, ownerId }, point = null) {
    buildRhinoNode(g, x, y, z, { role, thicknessMm, retract, ownerId, point, mats: nodeMats });
  }

  function buildModule(a) {
    if (!ctx.scene) return;
    const m = M[a.type],
      g = new THREE.Group(),
      colored = mat(a.color),
      [w, h, d] = (a.sizeCells || m.cells).map((v) => v * PITCH);
    g.userData.id = a.id;
    g.position.set(...position(a));
    // 格内吸附最近横档：模块整体沿 y 微调（|s| ≤ 12.5 mm），让各挂点背钩
    // 对准真实横档而不是抽象格点；横档保持 Rhino 工程位置。派生挂点坐标
    // 相对于模块组，无需逐点改动。
    g.position.y += rungSnapShiftMm(a, ctx.items || []) * 0.001;
    let act = null;
    // 薄界面（panel 与四种拓展界面）的派生挂点：板材背面位置由机械层决定。
    const pts = a.type !== 'block' && m.mount ? mountPoints(a, ctx.items || []) : [];
    const thicknessMm = a.exhibitMm ?? REF;
    const backZ = pts.length ? exhibitBackZ(a, pts[0].gz) : exhibitBackZ(a, a.gz);
    if (a.type === 'pillar') buildRhinoPillar(g, h, nodeMats);
    else if (a.type === 'block')
      node(g, 0, 0, CLAMP.anchorFromGridZMm * 0.001, {
        role: 'standalone',
        thicknessMm,
        retract: true,
        ownerId: a.id,
      });
    else if (['pegboard', 'mesh', 'metal', 'rope'].includes(a.type)) {
      buildSurface(g, a.type, w, h, d, { colored, white, silver, dark, orange }, { backZ });
    } else if (a.type === 'panel') {
      // 展板整板夹持（见图1）：背面贴软垫面（锚点 + 33.4 mm），蓝色前压板
      // 背面贴正面（33.4 + t）。导柱随滑块移动、尖端止于板正面并藏于压板后；
      // 整板无孔状态下导柱在角部区从板面进入板体（真实机构需角部孔/槽，
      // 未与用戶确认前不开孔，列为已知未确认项）。
      const depth = thicknessMm * 0.001;
      cube(g, w, h, depth, 0, 0, backZ + depth / 2, white);
      const front = new THREE.Mesh(
        new THREE.PlaneGeometry(w - 0.012, h - 0.012),
        textTexture('ON THE OCEAN', '72+ / 48 mm system'),
      );
      front.position.set(0, 0, backZ + depth + 0.001);
      g.add(front);
    } else if (a.type === 'acoustic' || a.type === 'sign') {
      const depth = a.type === 'sign' ? 0.025 : 0.025;
      cube(g, w, h, depth, 0, 0, 0.025, a.type === 'acoustic' ? mat('#829f9e') : white);
      if (a.type === 'sign') {
        const front = new THREE.Mesh(
          new THREE.PlaneGeometry(w - 0.012, h - 0.012),
          textTexture('WELCOME', '72+ / 48 mm system'),
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
    if (a.type !== 'block' && m.mount) {
      // 主场景只画有效挂点；独立目录缩略图才使用四角示意。
      if (pts.length) {
        const [cw, ch] = cells(a);
        const cx = a.gx + cw / 2,
          cy = a.gy + ch / 2;
        for (const p of pts) {
          const realNode = ctx.items.find(
            (b) =>
              b.id === a.parentId &&
              b.type === 'block' &&
              b.gx === p.gx &&
              b.gy === p.gy &&
              b.gz === p.gz,
          );
          if (!realNode)
            node(
              g,
              (p.gx + 0.5 - cx) * PITCH,
              (p.gy + 0.5 - cy) * PITCH,
              (p.gz - a.gz) * PITCH + CLAMP.anchorFromGridZMm * 0.001,
              {
                role: p.role,
                // 只有薄界面展品随厚度驱动滑块压板；其余模块滑块收回为完整立方体。
                ...(isExhibitType(a.type)
                  ? { thicknessMm }
                  : { thicknessMm: REF, retract: true }),
                ownerId: a.id,
              },
              p,
            );
        }
      } else if (ctx.preview && !ctx.items.some((item) => item.type === 'pillar')) {
        const xs = m.mount === 4 || a.type === 'rail' ? [-w / 2 + 0.024, w / 2 - 0.024] : [0];
        const ys = a.type === 'rail' ? [0] : [-h / 2 + 0.024, h / 2 - 0.024];
        for (const x of xs)
          for (const y of ys)
            node(g, x, y, CLAMP.anchorFromGridZMm * 0.001, {
              role: 'standalone',
              thicknessMm: REF,
              retract: true,
              ownerId: a.id,
            });
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
    g.userData.sizeKey = cells(a).join('x');
    g.userData.mountingKey = mountingKey(a, ctx.items || []);
    ctx.models.set(a.id, g);
    return g;
  }

  function dispose(g) {
    if (!g) return;
    ctx.scene.remove(g);
    g.traverse((o) => {
      // Rhino 网格模板全局共享，归 rhino.js 所有，这里绝不 dispose。
      if (o.geometry && !o.geometry.userData.rhinoShared) o.geometry.dispose();
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
