import {
  MODULES as M,
  PRESETS,
  EXHIBITIONS,
  assembly,
  compareLayouts,
  clone,
  GRID,
  cells,
  valid,
  clampPosition,
  conflict,
  findSpace,
  normalizeParents,
  childrenOf,
  parentFamily,
  placeMounted,
  mountingValid,
  mountPoints,
} from '../model/index.js';

// React reads immutable snapshots through useSyncExternalStore. Three.js consumes
// the same state; it never owns or rewrites the React interface.
export function createPlannerStore() {
  let state = {
    items: normalizeParents(clone(PRESETS[0].items)),
    selected: 'b',
    preset: 0,
    exhibition: 0,
    transition: null,
    filter: '全部',
    familyFilter: '全部',
    subkindFilter: '全部',
    rightTab: 'detail',
    view: '3d',
    viewRevision: 0,
    playing: false,
    night: false,
    dirty: false,
    showDims: true,
    gridTouched: false,
    sceneRevision: 0,
    toast: '',
    error: '',
  };
  let uid = 100,
    timer = null,
    toastTimer = null;
  const listeners = new Set();
  const update = (patch) => {
    state = { ...state, ...patch };
    listeners.forEach((fn) => fn());
  };
  const toast = (text) => {
    clearTimeout(toastTimer);
    update({ toast: text });
    toastTimer = setTimeout(() => update({ toast: '' }), 3200);
  };
  const stopPlay = () => {
    clearInterval(timer);
    timer = null;
    update({ playing: false });
  };
  const changed = () => {
    clearInterval(timer);
    timer = null;
    update({ dirty: true, playing: false });
  };
  const select = (id) => update({ selected: id, rightTab: 'detail' });
  function moveItem(id, patch, commit = true) {
    let a = state.items.find((x) => x.id === id);
    if (!a) {
      // Dragging an assembly node drives its attached extension, not a loose copy.
      a = state.items.find((x) => mountPoints(x, state.items).some((n) => n.id === id));
    }
    if (!a) return false;
    const hasSize = patch.sizeCells !== undefined;
    const axes = ['gx', 'gy', 'gz'];
    if (axes.some((k) => patch[k] !== undefined && !Number.isFinite(Number(patch[k])))) {
      if (commit) toast('请输入有效格坐标');
      return false;
    }
    if (hasSize && (!Array.isArray(patch.sizeCells) || patch.sizeCells.length !== 3
      || patch.sizeCells.some((v) => !Number.isFinite(Number(v)) || Number(v) < 1))) {
      if (commit) toast('尺寸必须是正整数格');
      return false;
    }
    const requested = { ...a };
    for (const k of axes) {
      if (patch[k] !== undefined) requested[k] = Math.round(Number(patch[k]));
    }
    if (hasSize) requested.sizeCells = patch.sizeCells.map((v) => Math.round(Number(v)));
    const next = placeMounted(requested, state.items, {
      resize: hasSize,
      retainSupports: hasSize,
    });
    if (!next) {
      if (commit) toast('尺寸需覆盖挂接梯柱；请保留有效连接位置');
      return false;
    }
    const delta = axes.map((k) => next[k] - a[k]);
    let items = state.items.map((x) => x.id === a.id ? next : { ...x });
    if (a.type === 'pillar') {
      items = items.map((x) => {
        if (!x.supportIds?.includes(a.id)) return x;
        const primary = x.supportIds[0] === a.id;
        return {
          ...x,
          gx: x.gx + (primary ? delta[0] : 0),
          gy: x.gy + delta[1],
          gz: x.gz + delta[2],
        };
      });
    } else {
      const descendants = childrenOf(a.id, state.items);
      items = items.map((x) => x.id !== a.id && descendants.has(x.id) ? {
        ...x,
        gx: x.gx + delta[0],
        gy: x.gy + delta[1],
        gz: x.gz + delta[2],
        supportIds: undefined,
      } : x);
    }
    items = normalizeParents(items);
    if (items.some((x) => !valid(x) || !mountingValid(x, items) || conflict(x, items))) {
      if (commit) toast('无法挂接：超界、重叠或连接点离开梯柱，已保留原位置');
      return false;
    }
    update({ items });
    if (commit) changed();
    return true;
  }
  function addItem(type, gx = 23, gy = 26, gz = 0, from = null, exact = false) {
    if (!M[type]) return;
    const selected = state.items.find((x) => x.id === state.selected);
    const parent = M[type].family === '拓展' && selected?.type === 'block' ? selected : null;
    const candidate = clampPosition({
      ...from,
      id: 'u' + uid,
      type,
      gx: parent ? parent.gx : gx,
      gy: parent ? parent.gy : gy,
      gz: parent ? parent.gz : gz,
      parentId: parent?.id,
      supportIds: undefined,
      state: from?.state || 0,
      color: from?.color || '#3158e8',
      intensity: from?.intensity || 65,
      temperature: from?.temperature || 3200,
    });
    const attempts = [candidate];
    if (!exact) {
      for (let y = 0; y < GRID[1]; y++) {
        for (const x of [candidate.gx, ...state.items.filter((p) => p.type === 'pillar').map((p) => p.gx)]) {
          attempts.push({ ...candidate, gx: x, gy: y });
        }
      }
      attempts.sort((a, b) =>
        Math.abs(a.gx - candidate.gx) + Math.abs(a.gy - candidate.gy)
        - Math.abs(b.gx - candidate.gx) - Math.abs(b.gy - candidate.gy));
    }
    let placed;
    for (const attempt of attempts) {
      const next = placeMounted(attempt, state.items);
      if (next && valid(next) && mountingValid(next, state.items)
        && !conflict(next, state.items)) {
        placed = next;
        break;
      }
    }
    if (!placed) {
      toast('没有可用挂接位置；请先添加梯柱，或腾出同组梯柱上的空间');
      return;
    }
    uid++;
    update({ items: [...state.items, placed], selected: placed.id, rightTab: 'detail' });
    changed();
    toast('已添加' + M[type].name + ' · 已吸附挂接');
    return placed;
  }
  function applyLayout(i, exhibition) {
    const layout = i === 0 ? EXHIBITIONS[exhibition] : PRESETS[i];
    const next = normalizeParents(clone(layout.items));
    for (const a of next) {
      const old = state.items.find((b) => b.id === a.id && b.type === a.type);
      if (old) a.color = old.color;
    }
    const transition = compareLayouts(state.items, next);
    update({
      preset: i,
      exhibition,
      transition,
      dirty: false,
      night: PRESETS[i].ambient === 'night',
      items: next,
      selected: next[0]?.id,
      sceneRevision: state.sceneRevision + 1,
    });
  }
  function setPreset(i) {
    if (PRESETS[i]) applyLayout(i, state.exhibition);
  }
  function setExhibition(i) {
    if (EXHIBITIONS[i]) applyLayout(0, i);
  }
  function patchItem(id, patch) {
    update({ items: state.items.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
    changed();
  }
  function resizeItem(id, sizeCells) {
    return moveItem(id, { sizeCells }, true);
  }
  function toggleState(id) {
    const a = state.items.find((x) => x.id === id);
    if (!a) return;
    const next = { ...a, state: a.state ? 0 : 1 };
    if (!valid(next)) {
      toast('切换后的活动包络超出网格，请先调整位置');
      return;
    }
    if (conflict(next, state.items)) {
      toast('切换后会与相邻模块重叠，请先调整位置');
      return;
    }
    patchItem(id, { state: next.state });
  }
  function remove(id) {
    const removed = childrenOf(id, state.items);
    for (const a of state.items) {
      if (a.supportIds?.includes(id)) removed.add(a.id);
    }
    update({ items: state.items.filter((a) => !removed.has(a.id)), selected: null });
    changed();
  }
  function duplicate(id) {
    const a = state.items.find((x) => x.id === id);
    if (a) addItem(a.type, a.gx + 1, a.gy + 1, a.gz, a);
  }
  function exportData() {
    return {
      project: '邮轮72变',
      version: 'grid48-2',
      wall_mm: [2900, 2900],
      grid: {
        unit_mm: 48,
        counts: GRID,
        origin_wall_mm: [10, 10, 0],
        axes: ['左右', '上下', '离墙'],
      },
      scene: PRESETS[state.preset].name,
      exhibition: state.preset === 0 ? EXHIBITIONS[state.exhibition].name : null,
      modified: state.dirty,
      warning:
        '整数格为占位与布局规则，材料厚度可小于一格。48mm背部适配系统、离墙叠放及承载待工程验证。',
      nodes: state.items.flatMap((a) => mountPoints(a, state.items)),
      modules: state.items.map((a) => ({
        ...a,
        name: M[a.type].name,
        position_cells: [a.gx, a.gy, a.gz],
        position_grid_mm: [a.gx, a.gy, a.gz].map((v) => v * 48),
        family: M[a.type].family,
        subkind: M[a.type].subkind,
        parent_id: a.parentId || null,
        support_ids: a.supportIds || [],
        connection_nodes: mountPoints(a, state.items),
        interfaces: M[a.type].interfaces,
        size_cells: cells(a),
        dimensions_mm: cells(a).map((v) => v * 48),
        reserved_cells: cells(a),
        interface: M[a.type].anchor,
        standard_parts: M[a.type].parts,
        assembly: assembly(a.type),
      })),
    };
  }
  return {
    getSnapshot: () => state,
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    toast,
    changed,
    select,
    moveItem,
    addItem,
    setPreset,
    setExhibition,
    patchItem,
    toggleState,
    remove,
    duplicate,
    exportData,
    stopPlay,
    setFilter: (filter) => update({ filter }),
    setFamilyFilter: (familyFilter) => update({ familyFilter, subkindFilter: '全部' }),
    setSubkindFilter: (subkindFilter) => update({ subkindFilter }),
    resizeItem,
    setTab: (rightTab) => update({ rightTab }),
    setView: (view) => update({ view, viewRevision: state.viewRevision + 1 }),
    setError: (error) => update({ error }),
    toggleGrid: () => update({ showDims: !state.showDims, gridTouched: true }),
    togglePlay: () => {
      if (state.playing) {
        stopPlay();
        return;
      }
      update({ playing: true });
      timer = setInterval(
        () =>
          state.preset === 0
            ? setExhibition((state.exhibition + 1) % EXHIBITIONS.length)
            : setPreset((state.preset + 1) % PRESETS.length),
        6500,
      );
    },
    destroy: () => {
      clearInterval(timer);
      clearTimeout(toastTimer);
      listeners.clear();
    },
  };
}
