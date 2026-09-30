import { mountRole } from './clamp.js';
import { MODULES } from '../modules.js';
import { clone, cells } from '../grid.js';

export function parentFamily(type) {
  if (MODULES[type]?.family === '节点') return '梯柱';
  if (MODULES[type]?.family === '拓展') return '节点';
  return null;
}
export function normalizeParents(items) {
  const next = clone(items);
  for (const a of next) {
    if (!parentFamily(a.type)) {
      delete a.parentId;
      continue;
    }
    const points = a.type === 'block' ? blockSupports(a, next) : mountPoints(a, next);
    const supports = new Set(points.map((p) => p.pillar_id));
    const nodes =
      MODULES[a.type].family === '拓展'
        ? next.filter((b) => b.type === 'block' && points.some((p) => nodeAtPoint(b, p)))
        : [];
    // 保留仍然有效的父级。新添一个节点不能接管整面墙。
    if (supports.has(a.parentId) || nodes.some((b) => b.id === a.parentId)) continue;
    a.parentId = nodes[0]?.id || points[0]?.pillar_id;
    if (!a.parentId) delete a.parentId;
  }
  return next;
}
export function childrenOf(id, items) {
  const out = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const a of items)
      if (a.parentId && out.has(a.parentId) && !out.has(a.id)) {
        out.add(a.id);
        changed = true;
      }
  }
  return out;
}
// 节点基于梯柱定位：存在梯柱时，节点的横向格位吸附到最近的梯柱列。
export function snapToPillar(a, items) {
  if (MODULES[a.type]?.family !== '节点') return a;
  const pillars = pillarsFor(a, items);
  if (!pillars.length) return a;
  const gx = pillars.reduce(
    (best, p) => (Math.abs(p.gx - a.gx) < Math.abs(best - a.gx) ? p.gx : best),
    pillars[0].gx,
  );
  return gx === a.gx ? a : { ...a, gx };
}
// 梯柱的 z 向承托范围是否够到模块背平面（梯柱深 1 格：gz 0/1 的模块都挂在同一根梯柱上）。
const pillarReaches = (p, a) =>
  p.gz <= a.gz &&
  p.gz + cells(p)[2] >= a.gz &&
  p.gy <= a.gy &&
  p.gy + cells(p)[1] >= a.gy + cells(a)[1];
export const pillarsFor = (a, items) =>
  items
    .filter((b) => b.id !== a.id && MODULES[b.type]?.family === '梯柱' && pillarReaches(b, a))
    .sort((x, y) => x.gx - y.gx);
// 派生挂接点：拓展模块的概念节点必须落在梯柱列上。
// 只作为几何与导出的派生数据，不进入 state.items，避免配置清单膨胀。
export function mountPoints(a, items) {
  const m = MODULES[a.type];
  if (!m || a.type === 'block' || !m.mount) return [];
  const pillars = pillarsFor(a, items);
  if (!pillars.length) return [];
  const [w, h] = cells(a);
  // 梯柱列与模块跨度（含左右端面贴合）相交即视为挂接在该梯柱上。
  const inside = pillars.filter((p) => p.gx >= a.gx - 1 && p.gx <= a.gx + w);
  if (!inside.length) return [];
  let cols = [inside[0].gx];
  if ((a.type === 'rail' || m.mount === 4) && inside.length < 2) return [];
  if (inside.length >= 2 && (m.mount >= 4 || h <= 1))
    cols = [inside[0].gx, inside[inside.length - 1].gx];
  const lo = a.gy,
    hi = a.gy + h - 1;
  const rowsFor = (count) =>
    count === 1
      ? [lo]
      : Array.from({ length: count }, (_, i) => Math.round(lo + ((hi - lo) * i) / (count - 1)));
  const pts =
    cols.length >= 2
      ? cols.flatMap((gx) => rowsFor(Math.ceil(m.mount / 2)).map((gy) => ({ gx, gy })))
      : rowsFor(m.mount).map((gy) => ({ gx: cols[0], gy }));
  return pts.slice(0, m.mount).map((p, i) => ({
    id: `${a.id}:mp:${i}`,
    owner_id: a.id,
    pillar_id: pillars.find((q) => q.gx === p.gx)?.id ?? null,
    gx: p.gx,
    gy: p.gy,
    gz: pillars.find((q) => q.gx === p.gx).gz,
    // 机械层角色：底行承托、顶行限位；与 clamp.js 的 mountRole 同规则。
    role: mountRole(p.gy, a.gy, a.gy + h - 1),
  }));
}

export const nodeAtPoint = (node, point) =>
  node.gx === point.gx && node.gy === point.gy && node.gz === point.gz;

export function blockSupports(a, items) {
  return pillarsFor(a, items)
    .filter((p) => p.gx === a.gx)
    .map((p) => ({ pillar_id: p.id }));
}

export function mounted(a, items) {
  if (a.type === 'pillar') return true;
  if (a.type === 'block') return blockSupports(a, items).length > 0;
  const points = mountPoints(a, items);
  const unique = new Set(points.map((p) => [p.gx, p.gy, p.gz].join(',')));
  return points.length === MODULES[a.type].mount && unique.size === points.length;
}

// 拓展模块的横向归位：所在跨度内含梯柱则保持原位；否则平移到最近梯柱的边缘，
// 使模块始终挂接在梯柱上（节点由 mountPoints 派生，随模块随动）。
export function snapExtension(a, items) {
  if (MODULES[a.type]?.family !== '拓展') return a;
  const [w] = cells(a);
  const pillars = pillarsFor(a, items);
  if (!pillars.length) return a;
  if (MODULES[a.type].mount === 4) {
    const candidates = [];
    for (let i = 0; i < pillars.length - 1; i++) {
      const min = pillars[i + 1].gx - w;
      const max = pillars[i].gx + 1;
      if (min <= max) candidates.push(Math.max(min, Math.min(max, a.gx)));
    }
    candidates.sort((x, y) => Math.abs(x - a.gx) - Math.abs(y - a.gx));
    return candidates.length ? { ...a, gx: candidates[0] } : a;
  }
  const inside = pillars.filter((p) => p.gx >= a.gx - 1 && p.gx <= a.gx + w);
  if (inside.length) return a;
  const mid = a.gx + w / 2;
  const nearest = pillars.reduce((best, p) =>
    Math.abs(p.gx + 0.5 - mid) < Math.abs(best.gx + 0.5 - mid) ? p : best,
  );
  const gx = nearest.gx + 0.5 <= mid ? nearest.gx : nearest.gx - w + 1;
  return gx === a.gx ? a : { ...a, gx };
}
// 预设/初始布局的统一入口：归一父子关系后，把拓展模块归位到梯柱挂接范围。
export const attachExtensions = (items) =>
  items.map((a) => (MODULES[a.type]?.family === '拓展' ? snapExtension(a, items) : a));
export const prepareLayout = (items) => normalizeParents(attachExtensions(clone(items)));
