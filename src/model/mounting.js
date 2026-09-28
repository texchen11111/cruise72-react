import { MODULES, cells, clone } from './index.js';

const family = (a) => MODULES[a.type].family;
const wide = (a) => MODULES[a.type].mount === 4 || a.type === 'rail';
const pillarsOf = (items) => items.filter((a) => family(a) === '梯柱');

export function snapToPillar(a, items) {
  if (family(a) !== '节点') return a;
  return placeMounted(a, items) || a;
}

// Assemblies own their connection nodes. These are not duplicate catalogue items.
// IDs persist across moves and scene changes; coordinates are actual grid points.
export function mountPoints(a, items) {
  if (family(a) === '梯柱') return [];
  const [w, h] = cells(a);
  const supports = (a.supportIds || []).map((id) => items.find((p) => p.id === id));
  if (!supports.length || supports.some((p) => !p)) return [];
  const ys = a.type === 'block' || a.type === 'rail' ? [a.gy] : [a.gy, a.gy + h - 1];
  return supports.flatMap((p, column) => ys.map((gy, row) => ({
    id: a.type === 'block' ? a.id
      : column === 0 && row === 0 && items.some((p) => p.id === a.parentId && p.type === 'block')
        ? a.parentId : `${a.id}:node:${column}:${row}`,
    ownerId: a.id,
    parentId: p.id,
    gx: p.gx,
    gy,
    gz: p.gz,
  })));
}

export function placeMounted(a, items, { resize = false, retainSupports = false } = {}) {
  if (family(a) === '梯柱') return { ...a };
  const pillars = pillarsOf(items).sort((x, y) => x.gx - y.gx);
  if (!pillars.length) return null;
  const [w, h, d] = a.sizeCells || MODULES[a.type].cells;
  let supports;
  if (retainSupports && a.supportIds?.length) {
    supports = a.supportIds.map((id) => pillars.find((p) => p.id === id));
    if (supports.some((p) => !p)) return null;
  } else if (wide(a)) {
    const pairs = pillars.slice(0, -1).map((p, i) => [p, pillars[i + 1]])
      .filter(([left, right]) => left.gz === right.gz && right.gx > left.gx);
    pairs.sort((x, y) => {
      const score = ([l, r]) => Math.abs(l.gx - a.gx) + Math.abs(r.gx - l.gx + 1 - w);
      return score(x) - score(y);
    });
    supports = pairs[0];
  } else {
    supports = [pillars.reduce((best, p) =>
      Math.abs(p.gx - a.gx) < Math.abs(best.gx - a.gx) ? p : best)];
  }
  if (!supports?.length) return null;
  const [left] = supports;
  const span = supports.at(-1).gx - left.gx + 1;
  if (resize && w < span) return null;
  const next = {
    ...a,
    gx: left.gx,
    gz: left.gz,
    supportIds: supports.map((p) => p.id),
  };
  if (w < span) next.sizeCells = [span, h, d];
  next.parentId = family(a) === '节点' ? left.id : `${a.id}:node:0:0`;
  // An explicitly selected standalone node may be reused instead of drawing a second one.
  const parent = items.find((p) => p.id === a.parentId && p.type === 'block');
  if (parent && parent.supportIds?.[0] === left.id && parent.gy === a.gy) {
    next.parentId = parent.id;
  }
  return next;
}

export function mountingValid(a, items) {
  if (family(a) === '梯柱') return true;
  const points = mountPoints(a, items);
  if (points.length !== MODULES[a.type].mount) return false;
  return points.every((n) => {
    const p = items.find((p) => p.id === n.parentId);
    return p && n.gx === p.gx && n.gz === p.gz
      && n.gy >= p.gy && n.gy < p.gy + cells(p)[1]
      && n.gx >= a.gx && n.gx < a.gx + cells(a)[0];
  });
}

export function normalizeParents(items) {
  const next = clone(items);
  return next.map((a) => {
    if (family(a) === '梯柱') {
      delete a.parentId;
      delete a.supportIds;
      return a;
    }
    return placeMounted(a, next, { retainSupports: !!a.supportIds?.length }) || a;
  });
}
