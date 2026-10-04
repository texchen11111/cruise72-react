import { GRID, ORIGIN, PITCH } from './constants.js';
import { MODULES } from './modules.js';
import { item } from './scenes.js';

export const clone = (x) => JSON.parse(JSON.stringify(x));
export function cells(a) {
  const c = [...(a.sizeCells || MODULES[a.type].cells)];
  if (a.type === 'cabinet' && a.state) c[2] += 14;
  return c;
}
export function envelope(a) {
  const c = cells(a);
  return {
    min: [a.gx, a.gy, a.gz],
    max: [a.gx + c[0], a.gy + c[1], a.gz + c[2]],
  };
}
export function valid(a) {
  return ['gx', 'gy', 'gz'].every(
    (k, i) =>
      Number.isInteger(a[k]) && a[k] >= 0 && a[k] + cells(a)[i] <= GRID[i],
  );
}
export function clampPosition(a) {
  const c = cells(a);
  return {
    ...a,
    ...Object.fromEntries(
      ['gx', 'gy', 'gz'].map((k, i) => [
        k,
        Math.max(0, Math.min(GRID[i] - c[i], Math.round(Number(a[k]) || 0))),
      ]),
    ),
  };
}
export function conflict(a, items) {
  const e = envelope(a);
  const aPillar = MODULES[a.type]?.family === '梯柱';
  return items.find((b) => {
    if (b.id === a.id) return false;
    // 梯柱是挂载基底：与节点、拓展的包络重叠不算冲突；梯柱之间仍互斥。
    if (aPillar !== (MODULES[b.type]?.family === '梯柱')) return false;
    // 真实节点与明确挂到它的拓展共用连接位置。
    if (
      (a.type === 'block' && b.parentId === a.id) ||
      (b.type === 'block' && a.parentId === b.id)
    )
      return false;
    const f = envelope(b);
    return e.min.every((v, i) => v < f.max[i] && e.max[i] > f.min[i]);
  });
}
export function position(a) {
  const c = cells(a);
  return [
    ORIGIN[0] + (a.gx + c[0] / 2) * PITCH,
    ORIGIN[1] + (a.gy + c[1] / 2) * PITCH,
    a.gz * PITCH,
  ];
}
export function findSpace(type, items, gx = 0, gy = 25, gz = 0, source = {}) {
  const a = clampPosition({
    ...item('new', type, gx, gy, 0, gz),
    ...source,
    type,
    id: 'new',
    gx,
    gy,
    gz,
  });
  if (!conflict(a, items)) return a;
  for (let r = 1; r < Math.max(GRID[0], GRID[1]); r++)
    for (let dx = -r; dx <= r; dx++)
      for (const dy of [-r, r]) {
        const n = { ...a, gx: a.gx + dx, gy: a.gy + dy };
        if (valid(n) && !conflict(n, items)) return n;
      }
  for (let x = 0; x < GRID[0]; x++)
    for (let y = 0; y < GRID[1]; y++) {
      const n = { ...a, gx: x, gy: y };
      if (valid(n) && !conflict(n, items)) return n;
    }
  return null;
}
