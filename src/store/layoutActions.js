import {
  MODULES as M,
  GRID,
  valid,
  clampPosition,
  conflict,
  normalizeParents,
  childrenOf,
  parentFamily,
  snapToPillar,
  snapExtension,
  mounted,
  validThickness,
} from '../core/index.js';

// 布局操作：移动、添加、属性修补、缩放、状态切换、移除与复制。
// 通过 ctx 读取状态与触发更新，不直接持有闭包状态。
export function createLayoutActions({ getState, update, toast, changed, getUid, advanceUid }) {
  function moveItem(id, patch, commit = true) {
    const a = getState().items.find((x) => x.id === id);
    if (!a) return false;
    const positionPatch = Object.fromEntries(
      Object.entries(patch).filter(([k]) => ['gx', 'gy', 'gz'].includes(k)),
    );
    const hasSize = patch.sizeCells !== undefined;
    if (Object.values(positionPatch).some((v) => !Number.isFinite(Number(v)))) {
      if (commit) toast('请输入有效格坐标');
      return false;
    }
    if (
      hasSize &&
      (!Array.isArray(patch.sizeCells) ||
        patch.sizeCells.length !== 3 ||
        patch.sizeCells.some((v) => !Number.isFinite(Number(v)) || Number(v) < 1))
    ) {
      if (commit) toast('尺寸必须是正整数格');
      return false;
    }
    let next = {
      ...a,
      ...patch,
      sizeCells: hasSize ? patch.sizeCells.map((v) => Math.round(Number(v))) : a.sizeCells,
    };
    for (const k of ['gx', 'gy', 'gz']) next[k] = Math.round(next[k]);
    // 节点基于梯柱移动：横向格位吸附到最近的梯柱列；拓展移动时归位到梯柱挂接范围。
    // 尺寸调整只重算派生挂接点，不改变模块位置，避免缩放时模块跳位。
    next = hasSize
      ? snapToPillar(next, getState().items)
      : snapExtension(snapToPillar(next, getState().items), getState().items);
    const moving = childrenOf(id, getState().items);
    const delta = ['gx', 'gy', 'gz'].map((k) => next[k] - a[k]);
    const subtree = getState().items.filter((x) => moving.has(x.id));
    const moved = subtree.map((x) => ({
      ...x,
      gx: x.gx + delta[0],
      gy: x.gy + delta[1],
      gz: x.gz + delta[2],
    }));
    const candidate = hasSize ? moved.map((x) => (x.id === id ? next : x)) : moved;
    const others = getState().items.filter((x) => !moving.has(x.id));
    if (
      candidate.some(
        (x) =>
          !valid(x) ||
          conflict(x, others) ||
          candidate.some((y) => y.id !== x.id && conflict(x, [y])),
      )
    ) {
      if (commit) toast('超出网格或占位重叠：请换一个位置');
      return false;
    }
    const byId = new Map(candidate.map((x) => [x.id, x]));
    const items = normalizeParents(getState().items.map((x) => byId.get(x.id) || x));
    if (items.some((x) => !mounted(x, items) || conflict(x, items))) {
      if (commit) toast('挂接点必须落在梯柱范围内；请调整位置或尺寸');
      return false;
    }
    update({ items });
    if (commit) changed();
    return true;
  }
  function addItem(type, gx = 23, gy = 26, gz = 0, from = null, exact = false) {
    if (!M[type]) return;
    const candidate = clampPosition({
      ...from,
      id: 'new',
      type,
      gx,
      gy,
      gz,
      state: from?.state || 0,
      color: from?.color || '#3158e8',
      intensity: from?.intensity || 65,
      temperature: from?.temperature || 3200,
    });
    const selected = getState().items.find((x) => x.id === getState().selected);
    const wanted = parentFamily(type);
    const parent = wanted && selected && M[selected.type]?.family === wanted ? selected : null;
    const place = (position) => {
      const snapped = snapExtension(snapToPillar(position, getState().items), getState().items);
      const proposed = { ...snapped, id: getUid(), parentId: parent?.id };
      const items = normalizeParents([...getState().items, proposed]);
      const a = items[items.length - 1];
      return valid(a) && mounted(a, items) && !conflict(a, items) ? { a, items } : null;
    };
    let placed = place(candidate);
    // 每个候选位置都先吸附再校验，不能在失败后退回悬空位置。
    if (!placed && !exact) {
      const positions = [];
      for (let x = 0; x < GRID[0]; x++) {
        for (let y = 0; y < GRID[1]; y++) {
          positions.push({ ...candidate, gx: x, gy: y });
        }
      }
      positions.sort(
        (a, b) =>
          Math.abs(a.gx - gx) + Math.abs(a.gy - gy) - Math.abs(b.gx - gx) - Math.abs(b.gy - gy),
      );
      for (const position of positions) {
        placed = place(position);
        if (placed) break;
      }
    }
    if (!placed) {
      toast('没有可用挂接位置：请检查梯柱高度、跨度和模块占位');
      return;
    }
    const { a, items } = placed;
    advanceUid();
    update({ items, selected: a.id, rightTab: 'detail' });
    changed();
    toast('已添加' + M[type].name + ' · ' + M[type].cells.join(' × ') + ' 格');
    return a;
  }
  function patchItem(id, patch) {
    const a = getState().items.find((x) => x.id === id);
    if (!a) return false;
    // 展板厚度是机械层参数：超出 Rhino 夹持范围（1–12 mm）直接拒绝并提示，
    // 避免画面出现导柱穿板或滑块超程的无效状态。
    if (patch.exhibitMm !== undefined) {
      const t = Number(patch.exhibitMm);
      if (!validThickness(t)) {
        toast('展板厚度需在 1–12 mm 范围内');
        return false;
      }
      patch = { ...patch, exhibitMm: Math.round(t * 10) / 10 };
    }
    update({ items: getState().items.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
    changed();
    return true;
  }
  function resizeItem(id, sizeCells, commit = true) {
    const a = getState().items.find((x) => x.id === id);
    const base = [...sizeCells];
    // 输入和拖动显示活动包络，储存时扣除柜门预留，避免反复增加 14 格。
    if (a?.type === 'cabinet' && a.state) base[2] -= 14;
    return moveItem(id, { sizeCells: base }, commit);
  }
  function toggleState(id) {
    const a = getState().items.find((x) => x.id === id);
    if (!a) return;
    const next = { ...a, state: a.state ? 0 : 1 };
    if (!valid(next)) {
      toast('切换后的活动包络超出网格，请先调整位置');
      return;
    }
    if (conflict(next, getState().items)) {
      toast('切换后会与相邻模块重叠，请先调整位置');
      return;
    }
    patchItem(id, { state: next.state });
  }
  function remove(id) {
    const items = normalizeParents(getState().items.filter((a) => a.id !== id));
    if (items.some((a) => !mounted(a, items))) {
      toast('这根梯柱仍有挂接模块，请先移动或移除相关模块');
      return false;
    }
    update({ items, selected: null });
    changed();
    return true;
  }
  function duplicate(id) {
    const a = getState().items.find((x) => x.id === id);
    if (a) addItem(a.type, a.gx + 1, a.gy + 1, a.gz, a);
  }
  return { moveItem, addItem, patchItem, resizeItem, toggleState, remove, duplicate };
}
