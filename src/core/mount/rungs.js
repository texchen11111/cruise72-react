import { CLAMP } from './clamp.js';
import { ORIGIN, PITCH } from '../constants.js';
import { cells, position } from '../grid.js';
import { mountPoints, pillarsFor, nodeAtPoint } from './mounting.js';

// ── 格内吸附最近横档（真实装配方案，解决 48/25 互质偏差）──────────────────
// 真实装配里节点背钩挂在横档上，而不是抽象 48 mm 格点上。48 与 25 互质，
// 纯格点锚定 worst 12.5 mm，背钩会整体脱钩；全局渲染相位对布局后的真实
// 挂载行集（29 个不同行）也无解（最优相位 worst 仍 11.5 mm）。因此采用
// 方案三：模块（含独立节点）在格内沿 y 做 minimax 微调，|微调量| ≤ 12.5 mm，
// 模块仍遵守原格位占位规则。实测全部预设/展陈挂点（n=103）：残差
// worst 5.5 mm / avg 2.66 mm；按占位钩口包络（高 7 mm，横档厚 4.8 mm）
// 计算，残差 5.5 mm 时背钩与横档仍保持 ≥ 2.0 mm 实体重叠，视觉上不脱钩。
// 最终容许值待 Rhino 承托弧加工尺寸确认（挂钩承托弧_待圆弧加工）。
// 横档格架取支撑梯柱的段底 + 12.5 + 25k（工程位置，不做渲染相位）。
const rungLatticeMm = (pillarBottomMm) => ({
  dist: (y) =>
    Math.abs(
      y - (pillarBottomMm + CLAMP.rungFirstCenterMm + CLAMP.rungPitchMm * Math.round((y - pillarBottomMm - CLAMP.rungFirstCenterMm) / CLAMP.rungPitchMm)),
    ),
});

// 模块各挂点的 y 向锚点（毫米，世界系）：派生挂点按挂点行，独立节点按自身格位。
function mountAnchorRowsMm(a, items) {
  if (a.type === 'block') {
    const p = pillarsFor(a, items).find((q) => q.gx === a.gx);
    if (!p) return { pillar: null, rows: [] };
    return {
      pillar: p,
      rows: [ORIGIN[1] * 1000 + (a.gy + 0.5) * PITCH * 1000],
    };
  }
  const pts = mountPoints(a, items);
  if (!pts.length) return { pillar: null, rows: [] };
  const pillar = items.find((b) => b.id === pts[0].pillar_id);
  const rows = [...new Set(pts.map((p) => Math.round(ORIGIN[1] * 1000 + (p.gy + 0.5) * PITCH * 1000)))];
  return { pillar, rows };
}

// 微调后各挂点背钩中心到最近横档中心的残差（毫米，非负）。
export function mountRungResidualsMm(a, items) {
  const { pillar, rows } = mountAnchorRowsMm(a, items);
  if (!pillar || !rows.length) return [];
  const bottomMm = (position(pillar)[1] - (cells(pillar)[1] * PITCH) / 2) * 1000;
  const lat = rungLatticeMm(bottomMm);
  const s = rungSnapShiftMm(a, items);
  return rows.map((y) => +lat.dist(y + s).toFixed(3));
}

export function rungSnapShiftMm(a, items) {
  const { pillar, rows } = mountAnchorRowsMm(a, items);
  if (!pillar || !rows.length) return 0;
  const bottomMm = (position(pillar)[1] - (cells(pillar)[1] * PITCH) / 2) * 1000;
  const lat = rungLatticeMm(bottomMm);
  // 连续扫描微调量：最小化各挂点残差的最大值（minimax），步长 0.05 mm。
  let best = 0,
    bestMax = Infinity;
  for (let s = -CLAMP.rungPitchMm / 2; s <= CLAMP.rungPitchMm / 2 + 1e-9; s += 0.05) {
    const m = Math.max(...rows.map((y) => lat.dist(y + s)));
    if (m < bestMax - 1e-9) {
      bestMax = m;
      best = s;
    }
  }
  return +best.toFixed(2);
}

// 几何缓存必须包括相对挂点：模块平移时，节点仍应留在真实梯柱列上。
// 展板厚度驱动滑块行程，必须纳入缓存键，否则变厚度不触发重建。
export function mountingKey(a, items) {
  return JSON.stringify({
    thicknessMm: a.exhibitMm ?? CLAMP.referenceExhibitMm,
    points: mountPoints(a, items).map((p) => [
      p.pillar_id,
      p.gx - a.gx,
      p.gy - a.gy,
      p.gz - a.gz,
      p.role,
      items.find((b) => b.type === 'block' && b.id === a.parentId && nodeAtPoint(b, p))?.id,
    ]),
  });
}
