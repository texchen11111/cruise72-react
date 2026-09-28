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
  p23 = pil('p2', 23),
  p43 = pil('p3', 43);
ok(snapToPillar(node(4), [p3, p23, p43]).gx === 3, 'node snaps to nearest pillar column');
ok(snapToPillar(node(9), [p3, p23, p43]).gx === 3, 'node snaps left pillar');
ok(snapToPillar(node(30), [p3, p23, p43]).gx === 23, 'node snaps middle pillar');
ok(snapToPillar(node(60), [p3, p23, p43]).gx === 43, 'node snaps right pillar');
ok(snapToPillar(node(9), []).gx === 9, 'no pillars, no snap');
const panel9 = { id: 'x', type: 'panel', gx: 9, gy: 5, gz: 0, state: 0 };
ok(snapToPillar(panel9, [p3]).gx === 9, 'extensions never snap to pillars');
ok(
  !conflict({ id: 'm', type: 'panel', gx: 3, gy: 10, gz: 0, state: 0 }, [p3]),
  'pillar coexists with mounted module',
);
ok(conflict(pil('q', 3), [p3]), 'pillars still exclude each other');
for (const p of [...PRESETS, ...EXHIBITIONS]) {
  const pillars = p.items.filter((a) => a.type === 'pillar');
  ok(pillars.length === 3, p.id + ' has three pillars');
  const nodes = p.items.filter((a) => M[a.type].family === '节点');
  ok(
    nodes.every((a) => pillars.some((q) => q.gx === a.gx)),
    p.id + ' nodes sit on pillar columns',
  );
}
ok(
  cells({ type: 'worktop', state: 0 }).join() == cells({ type: 'worktop', state: 1 }).join(),
  'fold reserve retained',
);
console.log(checks + ' grid assertions passed; all space and exhibition presets valid.');
