import {
  MODULES as M,
  PRESETS,
  EXHIBITIONS,
  GRID,
  cells,
  rungSnapShiftMm,
  mountPoints,
  assembly,
  CLAMP,
  sliderOffsetMm,
} from '../core/index.js';

// 导出语义：把当前布局整理成配置清单（模块、派生挂接点与机械层参数）。
export function createExportData({ getState }) {
  return function exportData() {
    const state = getState();
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
  };
}
