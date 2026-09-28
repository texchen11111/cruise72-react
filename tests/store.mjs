import assert from 'node:assert/strict';
import { createPlannerStore } from '../src/store/index.js';
import { PRESETS, clone } from '../src/model/index.js';
const s = createPlannerStore();
let notifications = 0;
const off = s.subscribe(() => notifications++);
try {
  assert.deepEqual(s.getSnapshot().items, PRESETS[0].items);
  const first = s.getSnapshot();
  s.setFilter('氛围');
  assert.notEqual(first, s.getSnapshot());
  assert.equal(first.filter, '全部');
  const block = s.addItem('block', 0, 0, 0);
  assert.equal(s.getSnapshot().selected, block.id);
  assert.equal(s.moveItem(block.id, { gx: 1, gy: 1, gz: 1 }), true);
  const saved = clone(s.getSnapshot().items);
  assert.equal(s.moveItem(block.id, { gx: -1 }), false);
  assert.deepEqual(s.getSnapshot().items, saved);
  s.addItem('block', 2, 1, 1, null, true);
  assert.equal(s.moveItem(block.id, { gx: 2 }), false);
  s.duplicate(block.id);
  assert.equal(s.getSnapshot().items.length, 9);
  s.remove(block.id);
  assert.equal(s.getSnapshot().items.length, 8);
  for (let i = 0; i < 4; i++) {
    s.setPreset(i);
    assert.deepEqual(s.getSnapshot().items, PRESETS[i].items);
    assert.equal(s.getSnapshot().night, i === 3);
    assert.equal(s.getSnapshot().dirty, false);
  }
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
  s.togglePlay();
  assert.equal(s.getSnapshot().playing, true);
  s.moveItem('a', { gx: 4 });
  assert.equal(s.getSnapshot().playing, false);
  s.toggleGrid();
  assert.equal(s.getSnapshot().showDims, false);
  assert.ok(notifications > 20);
  s.setExhibition(1);
  assert.equal(s.getSnapshot().transition.retained, 3);
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
  const pillar = h.addItem('pillar', 0, 0, 0, null, true);
  const node = h.addItem('block', 4, 4, 0, null, true);
  assert.equal(node.parentId, pillar.id);
  const extension = h.addItem('panel', 8, 4, 0, null, true);
  assert.equal(extension.parentId, node.id);
  const before = h.getSnapshot().items.map((a) => ({ id: a.id, gx: a.gx, gy: a.gy }));
  assert.equal(h.moveItem(pillar.id, { gx: 2 }), true);
  for (const a of h.getSnapshot().items.filter((x) => [node.id, extension.id].includes(x.id))) {
    const old = before.find((x) => x.id === a.id);
    assert.equal(a.gx, old.gx + 2);
  }
  assert.equal(h.resizeItem(extension.id, [16, 12, 1]), true);
  assert.deepEqual(h.exportData().modules.find((a) => a.id === extension.id).size_cells, [16, 12, 1]);
  h.destroy();
  console.log(
    'React store: immutable snapshots, add/duplicate/remove, movement/collision, presets, states, export and autoplay passed.',
  );
} finally {
  off();
  s.destroy();
}
