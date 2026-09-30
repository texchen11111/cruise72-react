import {
  MODULES as M,
  PRESETS,
  EXHIBITIONS,
  assembly,
  compareLayouts,
  GRID,
  cells,
  valid,
  clampPosition,
  conflict,
  normalizeParents,
  prepareLayout,
  childrenOf,
  parentFamily,
  snapToPillar,
  snapExtension,
  mountPoints,
  mounted,
  rungSnapShiftMm,
  CLAMP,
  validThickness,
  sliderOffsetMm,
} from '../model/index.js';

// React reads immutable snapshots through useSyncExternalStore. Three.js consumes
// the same state; it never owns or rewrites the React interface.
export function createPlannerStore() {
  let state = {
    items: prepareLayout(PRESETS[0].items),
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
    const a = state.items.find((x) => x.id === id);
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
      ? snapToPillar(next, state.items)
      : snapExtension(snapToPillar(next, state.items), state.items);
    const moving = childrenOf(id, state.items);
    const delta = ['gx', 'gy', 'gz'].map((k) => next[k] - a[k]);
    const subtree = state.items.filter((x) => moving.has(x.id));
    const moved = subtree.map((x) => ({
      ...x,
      gx: x.gx + delta[0],
      gy: x.gy + delta[1],
      gz: x.gz + delta[2],
    }));
    const candidate = hasSize ? moved.map((x) => (x.id === id ? next : x)) : moved;
    const others = state.items.filter((x) => !moving.has(x.id));
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
    const items = normalizeParents(state.items.map((x) => byId.get(x.id) || x));
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
    const selected = state.items.find((x) => x.id === state.selected);
    const wanted = parentFamily(type);
    const parent = wanted && selected && M[selected.type]?.family === wanted ? selected : null;
    const place = (position) => {
      const snapped = snapExtension(snapToPillar(position, state.items), state.items);
      const proposed = { ...snapped, id: 'u' + uid, parentId: parent?.id };
      const items = normalizeParents([...state.items, proposed]);
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
    uid++;
    update({ items, selected: a.id, rightTab: 'detail' });
    changed();
    toast('已添加' + M[type].name + ' · ' + M[type].cells.join(' × ') + ' 格');
    return a;
  }
  function applyLayout(i, exhibition) {
    const layout = i === 0 ? EXHIBITIONS[exhibition] : PRESETS[i];
    const next = prepareLayout(layout.items);
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
    const a = state.items.find((x) => x.id === id);
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
    update({ items: state.items.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
    changed();
    return true;
  }
  function resizeItem(id, sizeCells, commit = true) {
    const a = state.items.find((x) => x.id === id);
    const base = [...sizeCells];
    // 输入和拖动显示活动包络，储存时扣除柜门预留，避免反复增加 14 格。
    if (a?.type === 'cabinet' && a.state) base[2] -= 14;
    return moveItem(id, { sizeCells: base }, commit);
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
    const items = normalizeParents(state.items.filter((a) => a.id !== id));
    if (items.some((a) => !mounted(a, items))) {
      toast('这根梯柱仍有挂接模块，请先移动或移除相关模块');
      return false;
    }
    update({ items, selected: null });
    changed();
    return true;
  }
  function duplicate(id) {
    const a = state.items.find((x) => x.id === id);
    if (a) addItem(a.type, a.gx + 1, a.gy + 1, a.gz, a);
  }
  function exportData() {
    return {
      project: '邮轮72变',
      version: 'grid48-1',
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
      modules: state.items.map((a) => ({
        ...a,
        name: M[a.type].name,
        position_cells: [a.gx, a.gy, a.gz],
        position_grid_mm: [a.gx, a.gy, a.gz].map((v) => v * 48),
        // 格内吸附微调量（毫米，y 向）：真实装配位置 = 格位 + 微调。
        rungSnapShiftMm: rungSnapShiftMm(a, state.items),
        family: M[a.type].family,
        subkind: M[a.type].subkind,
        parent_id: a.parentId || null,
        interfaces: M[a.type].interfaces,
        size_cells: cells(a),
        dimensions_mm: cells(a).map((v) => v * 48),
        reserved_cells: cells(a),
        interface: M[a.type].anchor,
        standard_parts: M[a.type].parts,
        assembly: assembly(a.type),
      })),
      // 派生挂接点：由父子关系按梯柱列派生，仅供几何/建模引用，不计入模块数量。
      // role 与画面中的节点装配一致（底行承托 / 顶行限位 / 中间），机械参数
      // 直接给出毫米值，不与 48 mm 网格互相换算。
      connection_nodes: state.items.flatMap((a) => {
        const shiftMm = rungSnapShiftMm(a, state.items);
        return mountPoints(a, state.items).map((p) => ({
          ...p,
          owner_name: M[a.type].name,
          position_grid_mm: [p.gx, p.gy, p.gz].map((v) => v * 48),
          // anchor_world_mm 含格内吸附微调：真实装配中节点挂在横档上。
          anchor_world_mm: [
            Math.round((p.gx + 0.5) * 48 + 10),
            Math.round((p.gy + 0.5) * 48 + 10 + shiftMm),
            Math.round(p.gz * 48 + CLAMP.anchorFromGridZMm),
          ],
          rungSnapShiftMm: shiftMm,
          exhibitMm: a.exhibitMm ?? CLAMP.referenceExhibitMm,
          sliderOffsetMm: sliderOffsetMm(a.exhibitMm ?? CLAMP.referenceExhibitMm),
          clamp: {
            padFrontMm: CLAMP.padFrontMm,
            jawBackMm: CLAMP.jawBackMm,
            gapMm: CLAMP.gapMm,
            guideDiameterMm: CLAMP.guideDiameterMm,
            guideLengthMm: CLAMP.guideLengthMm,
            maxOutwardTravelMm: CLAMP.maxOutwardTravelMm,
            exhibitRangeMm: CLAMP.exhibitRangeMm,
          },
        }));
      }),
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
