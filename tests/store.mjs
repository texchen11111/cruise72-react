import assert from 'node:assert/strict';
import { createPlannerStore } from '../src/store/index.js';
import { PRESETS, clone, prepareLayout, mounted, CLAMP } from '../src/model/index.js';
const s = createPlannerStore();
let notifications = 0;
const off = s.subscribe(() => notifications++);
try {
  assert.deepEqual(s.getSnapshot().items, prepareLayout(PRESETS[0].items));
  const first = s.getSnapshot();
  s.setFilter('氛围');
  assert.notEqual(first, s.getSnapshot());
  assert.equal(first.filter, '全部');
  const block = s.addItem('block', 0, 0, 0);
  assert.equal(s.getSnapshot().selected, block.id);
  assert.equal(
    s.getSnapshot().items.find((a) => a.id === block.id).parentId,
    'p1',
    '节点挂到最近的梯柱',
  );
  assert.equal(s.moveItem(block.id, { gx: 1, gy: 1, gz: 1 }), true);
  assert.equal(
    s.getSnapshot().items.find((a) => a.id === block.id).gx,
    3,
    '节点横向吸附到最近的梯柱列',
  );
  const saved = clone(s.getSnapshot().items);
  assert.equal(s.moveItem(block.id, { gy: -1 }), false);
  assert.deepEqual(s.getSnapshot().items, saved);
  s.addItem('block', 2, 2, 1, null, true);
  assert.equal(s.moveItem(block.id, { gx: 2, gy: 2, gz: 1 }), false);
  s.duplicate(block.id);
  assert.equal(s.getSnapshot().items.length, 13);
  s.remove(block.id);
  assert.equal(s.getSnapshot().items.length, 12);
  for (let i = 0; i < 4; i++) {
    s.setPreset(i);
    assert.deepEqual(s.getSnapshot().items, prepareLayout(PRESETS[i].items));
    assert.equal(s.getSnapshot().night, i === 3);
    assert.equal(s.getSnapshot().dirty, false);
  }
  s.setPreset(0);
  assert.equal(
    s.getSnapshot().items.find((a) => a.id === 'a').parentId,
    'p1',
    '拓展回挂到最近的梯柱',
  );
  s.setExhibition(1);
  s.toggleState('v1');
  assert.equal(s.getSnapshot().items.find((a) => a.id === 'v1').state, 1);
  s.setExhibition(0);
  s.patchItem('d', { intensity: 85, temperature: 4000, color: '#ed8e40' });
  const d = s.exportData();
  assert.equal(d.version, 'grid48-1');
  assert.equal(d.grid.unit_mm, 48);
  assert.equal(d.modules.find((a) => a.id === 'd').intensity, 85);
  assert.deepEqual(d.modules[0].position_cells, [3, 27, 0]);
  const byId = new Map(d.modules.map((m) => [m.id, m]));
  const extensionMountTotal = s
    .getSnapshot()
    .items.filter((a) => byId.get(a.id)?.family === '拓展')
    .reduce((n, a) => n + byId.get(a.id).assembly.nodes, 0);
  assert.ok(Array.isArray(d.connection_nodes), 'export carries derived connection nodes');
  assert.equal(d.connection_nodes.length, extensionMountTotal, 'one derived node per mount point');
  assert.ok(
    d.connection_nodes.every((n) => n.pillar_id && d.modules.some((m) => m.id === n.pillar_id)),
    'derived nodes reference real pillars',
  );
  assert.ok(
    d.modules.every((m) => !String(m.id).includes(':mp:')),
    'connection points never leak into modules',
  );
  // 展板厚度：机械层参数，范围外拒绝并提示；导出带角色与机械尺寸。
  assert.equal(s.patchItem('a', { exhibitMm: 99 }), false, '非法厚度被拒绝');
  assert.equal(
    s.getSnapshot().items.find((a) => a.id === 'a').exhibitMm,
    6,
    '拒绝后厚度保持参考值',
  );
  assert.match(s.getSnapshot().toast, /1–12/);
  assert.equal(s.patchItem('a', { exhibitMm: 10 }), true);
  const cn = s.exportData().connection_nodes.filter((n) => n.owner_id === 'a');
  assert.equal(cn.length, 4, 'panel exports four connection nodes');
  assert.equal(cn.filter((n) => n.role === 'lower-support').length, 2, 'two lower supports');
  assert.equal(cn.filter((n) => n.role === 'upper-limit').length, 2, 'two upper limiters');
  assert.ok(
    cn.every(
      (n) =>
        n.clamp.guideDiameterMm === 6 &&
        n.clamp.jawBackMm === 40.4 &&
        n.exhibitMm === 10 &&
        n.sliderOffsetMm === 3,
    ),
    'connection nodes carry mechanical clamp data and live thickness',
  );
  assert.ok(
    cn.every((n) => n.anchor_world_mm[2] === n.gz * 48 + CLAMP.anchorFromGridZMm),
    'exported anchor equals the on-screen node anchor plane',
  );
  s.togglePlay();
  assert.equal(s.getSnapshot().playing, true);
  s.moveItem('a', { gy: 4 });
  assert.equal(s.getSnapshot().playing, false);
  s.toggleGrid();
  assert.equal(s.getSnapshot().showDims, false);
  assert.ok(notifications > 20);
  s.setExhibition(1);
  assert.equal(s.getSnapshot().transition.retained, 7);
  assert.equal(s.getSnapshot().transition.nodes, 6);
  assert.equal(s.exportData().exhibition, '层架陈列');
  s.setExhibition(2);
  assert.equal(s.getSnapshot().transition.moved, 3);
  s.toggleState('r1');
  assert.equal(s.getSnapshot().items.find((a) => a.id === 'r1').state, 1);
  assert.equal(s.exportData().modules.find((a) => a.id === 'r1').assembly.nodes, 4);
  s.setExhibition(3);
  assert.equal(s.getSnapshot().exhibition, 3);
  s.setPreset(1);
  s.setPreset(0);
  assert.equal(s.getSnapshot().exhibition, 3);
  const h = createPlannerStore();
  const original = clone(h.getSnapshot().items);
  const node = h.addItem('block', 3, 4, 0, null, true);
  assert.equal(node.parentId, 'p1');
  assert.deepEqual(
    h.getSnapshot().items.slice(0, original.length),
    original,
    '新增节点不改变已有模块的位置和父级',
  );
  const extension = h.addItem('panel', 3, 4, 0, null, true);
  assert.equal(extension.parentId, node.id);
  const panel2 = h.addItem('panel', 33, 4, 0, null, true);
  assert.equal(panel2.parentId, 'p3', '远处拓展不能绑到不相接的节点');
  const before = h.getSnapshot().items.map((a) => ({ id: a.id, gx: a.gx, gy: a.gy }));
  assert.equal(h.moveItem('p1', { gx: 4 }), false, '移动梯柱若导致上方模块碰撞，则整组拒绝移动');
  h.remove('a');
  assert.equal(h.moveItem('p1', { gx: 4 }), true);
  for (const a of h.getSnapshot().items.filter((x) => [node.id, extension.id].includes(x.id))) {
    const old = before.find((x) => x.id === a.id);
    assert.equal(a.gx, old.gx + 1);
  }
  assert.equal(h.getSnapshot().items.find((a) => a.id === panel2.id).gx, panel2.gx);
  assert.equal(h.resizeItem(extension.id, [16, 12, 1]), true);
  assert.deepEqual(
    h.exportData().modules.find((a) => a.id === extension.id).size_cells,
    [16, 12, 1],
  );
  assert.equal(h.moveItem(node.id, { gy: 5 }), true, '移动节点带动实际挂接的拓展');
  assert.equal(h.getSnapshot().items.find((a) => a.id === extension.id).gy, 5);
  const safe = clone(h.getSnapshot().items);
  assert.equal(h.moveItem(node.id, { gy: 48 }), false, '节点不能超出梯柱顶部');
  assert.equal(h.moveItem(extension.id, { gz: 8 }), false, '拓展不能悬空离墙');
  assert.equal(h.resizeItem('p1', [1, 10, 1]), false, '缩短梯柱不能使已挂模块脱落');
  assert.equal(h.remove('p1'), false, '删除支撑前必须处理依赖');
  assert.equal(h.addItem('block', 12, 52, 0, null, true), undefined);
  assert.deepEqual(h.getSnapshot().items, safe, '无效操作不改变任何构件');
  assert.ok(safe.every((a) => mounted(a, safe)));
  const count = h.getSnapshot().items.length;
  h.select(null);
  h.addItem('block', 4, 1, 0, null, true);
  assert.equal(h.getSnapshot().items.length, count + 1, '添加一个只增加一个');
  h.setExhibition(1);
  h.toggleState('v1');
  assert.equal(h.resizeItem('v1', [14, 11, 20]), true);
  assert.equal(h.resizeItem('v1', [14, 11, 20]), true);
  assert.equal(
    h.exportData().modules.find((a) => a.id === 'v1').size_cells[2],
    20,
    '打开的柜门反复调尺寸不会重复增加活动包络',
  );
  h.destroy();
  console.log(
    'React store: immutable snapshots, add/duplicate/remove, movement/collision, presets, states, export and autoplay passed.',
  );
} finally {
  off();
  s.destroy();
}
