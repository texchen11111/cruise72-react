import assert from 'node:assert/strict';
import {
  MODULES as M,
  PRESETS,
  EXHIBITIONS,
  GRID,
  cells,
  valid,
  position,
  conflict,
  findSpace,
  snapToPillar,
  snapExtension,
  mountPoints,
  prepareLayout,
  mounted,
} from '../src/model/index.js';
let checks = 0;
const ok = (v, m) => {
  assert.ok(v, m);
  checks++;
};
for (const p of [...PRESETS, ...EXHIBITIONS])
  for (const a of p.items) {
    ok(valid(a), p.id + ' bounds ' + a.id);
    ok(!conflict(a, p.items), p.id + ' conflict ' + a.id);
    const toggled = { ...a, state: a.state ? 0 : 1 };
    ok(valid(toggled) && !conflict(toggled, p.items), p.id + ' state ' + a.id);
  }
const a = { id: 'a', type: 'block', gx: 4, gy: 4, gz: 4, state: 0 };
for (const [i, k] of ['gx', 'gy', 'gz'].entries()) {
  const adjacent = { ...a, id: 'b', [k]: 5 };
  ok(!conflict(adjacent, [a]), 'touching axis ' + k);
  const overlap = { ...a, id: 'b' };
  ok(conflict(overlap, [a]), 'overlap ' + k);
  const moved = { ...a, [k]: a[k] + 1 };
  ok(Math.abs(position(moved)[i] - position(a)[i] - 0.048) < 1e-10, '48mm movement ' + k);
  ok(!valid({ ...a, [k]: GRID[i] }), 'outside ' + k);
  ok(!valid({ ...a, [k]: -1 }), 'negative ' + k);
  ok(!valid({ ...a, [k]: 1.5 }), 'fraction ' + k);
}
for (const type of Object.keys(M)) {
  const all = [];
  for (let i = 0; i < 20; i++) {
    const b = findSpace(type, all, 23, 25, 0);
    if (!b) break;
    b.id = type + i;
    ok(valid(b) && !conflict(b, all), 'add ' + type);
    all.push(b);
  }
}
const cabinet = { id: 'c', type: 'cabinet', gx: 0, gy: 0, gz: 0, state: 0 },
  b = { ...a, id: 'b', gx: 1, gy: 1, gz: 8 };
ok(!conflict(cabinet, [b]), 'closed front space');
ok(conflict({ ...cabinet, state: 1 }, [b]), 'door reserve');
const deep = { ...a, id: 'deep', gz: 5 };
ok(!conflict(deep, [a]), 'same XY different Z');

// 梯柱层级：节点吸附到最近的梯柱列，梯柱与挂载件共存不判冲突。
const pil = (id, gx) => ({ id, type: 'pillar', gx, gy: 0, gz: 0, state: 0 });
const node = (gx) => ({ id: 'n', type: 'block', gx, gy: 5, gz: 0, state: 0 });
const p3 = pil('p1', 3),
  p18 = pil('p2', 18),
  p33 = pil('p3', 33),
  p48 = pil('p4', 48);
const allP = [p3, p18, p33, p48];
ok(snapToPillar(node(4), allP).gx === 3, 'node snaps to nearest pillar column');
ok(snapToPillar(node(9), allP).gx === 3, 'node snaps left pillar');
ok(snapToPillar(node(30), allP).gx === 33, 'node snaps pillar 33');
ok(snapToPillar(node(60), allP).gx === 48, 'node snaps last pillar');
ok(snapToPillar(node(9), []).gx === 9, 'no pillars, no snap');
const panel9 = { id: 'x', type: 'panel', gx: 9, gy: 5, gz: 0, state: 0 };
ok(snapToPillar(panel9, [p3]).gx === 9, 'extensions never snap to pillars');
ok(
  !conflict({ id: 'm', type: 'panel', gx: 3, gy: 10, gz: 0, state: 0 }, [p3]),
  'pillar coexists with mounted module',
);
ok(conflict(pil('q', 3), [p3]), 'pillars still exclude each other');
// 派生挂接点：概念节点落在梯柱列上，由父子关系派生，不作为独立 item。
const panelM = { id: 'm', type: 'panel', gx: 3, gy: 10, gz: 0, state: 0 };
const pts = mountPoints(panelM, allP);
ok(pts.length === 4, 'panel derives four mount points');
ok(
  pts.every((q) => [3, 18].includes(q.gx)) && new Set(pts.map((q) => q.gx)).size === 2,
  'corner points sit on both spanned pillar columns',
);
ok(
  pts.every((q) => q.gy === 10 || q.gy === 21),
  'corner rows at module edges',
);
ok(
  pts.every((q) => q.pillar_id),
  'points reference their pillar',
);
const floatingLamp = { id: 'l', type: 'lamp', gx: 8, gy: 20, gz: 1, state: 0 };
ok(mountPoints(floatingLamp, allP).length === 0, 'no remote phantom nodes');
const lp = mountPoints(snapExtension(floatingLamp, allP), allP);
ok(lp.length === 2 && lp.every((q) => q.gx === 3), 'gz=1 module still mounts on a pillar column');
ok(
  mountPoints({ id: 'r', type: 'rail', gx: 3, gy: 5, gz: 0, state: 0 }, allP).length === 2,
  'crossbar really derives two nodes',
);
ok(
  mountPoints({ id: 'r', type: 'rail', gx: 3, gy: 5, gz: 0, state: 0 }, allP).every(
    (q) => q.gx === 3 || q.gx === 18,
  ),
  'crossbar ends sit on both pillar columns',
);
ok(mountPoints(p3, allP).length === 0, 'pillars derive no mount points');
ok(
  mountPoints({ id: 'b', type: 'block', gx: 3, gy: 5, gz: 0, state: 0 }, allP).length === 0,
  'real nodes derive no extra points',
);
// 拓展横向归位：挂接范围内有梯柱则保持原位；否则平移到最近梯柱的边缘，使模块始终挂接在梯柱上。
ok(
  snapExtension({ id: 'l', type: 'lamp', gx: 8, gy: 5, gz: 0, state: 0 }, allP).gx === 3,
  'narrow extension attaches at nearest pillar edge',
);
ok(
  snapExtension({ id: 'c', type: 'cabinet', gx: 4, gy: 5, gz: 0, state: 0 }, allP).gx === 4,
  'wide module between face-contact pillars stays',
);
for (const p of [...PRESETS, ...EXHIBITIONS]) {
  const pillars = p.items.filter((a) => a.type === 'pillar');
  ok(pillars.length === 4, p.id + ' has four pillars');
  const nodes = p.items.filter((a) => M[a.type].family === '节点');
  ok(
    nodes.every((a) => pillars.some((q) => q.gx === a.gx)),
    p.id + ' nodes sit on pillar columns',
  );
  const laid = prepareLayout(p.items);
  ok(
    laid.every((a) => mounted(a, laid)),
    p.id + ' all assemblies have usable supports',
  );
  for (const a of laid) {
    for (const point of mountPoints(a, laid)) {
      const pillar = laid.find((b) => b.id === point.pillar_id);
      ok(
        point.gy >= pillar.gy && point.gy < pillar.gy + cells(pillar)[1],
        p.id + ' mount within pillar height',
      );
      ok(point.gz === pillar.gz, p.id + ' mount uses its own pillar depth');
    }
  }
  ok(
    laid.every((a) => valid(a) && !conflict(a, laid)),
    p.id + ' prepared layout stays valid',
  );
  const extensions = laid.filter((a) => M[a.type].family === '拓展');
  ok(
    extensions.every((a) => mountPoints(a, laid).length === M[a.type].mount),
    p.id + ' extensions fully mounted on pillars',
  );
  ok(
    extensions.every((a) => !!a.parentId),
    p.id + ' extensions have a parent',
  );
  ok(
    extensions.every((a) => laid.some((q) => q.id === a.parentId && M[q.type].family !== '拓展')),
    p.id + ' extension parents are ladder or nodes',
  );
}
ok(
  cells({ type: 'worktop', state: 0 }).join() == cells({ type: 'worktop', state: 1 }).join(),
  'fold reserve retained',
);
console.log(checks + ' grid assertions passed; all space and exhibition presets valid.');
