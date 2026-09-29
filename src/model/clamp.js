// 机械参数层：Rhino V3 节点的真实机器尺寸（毫米）。
// 这一层与 48 mm 布局网格刻意分离：格坐标（布局规则）和机械尺寸（加工配合）
// 是两套数据，禁止互相换算。25 mm 横档间距、9 mm 窄颈、Ø6 导柱等
// 只存在于本层；网格层只知道 48 mm 单元。
export const MM = 0.001;

export const CLAMP = {
  // 节点锚点面：世界 z = gz * 48 + 24 mm（24 mm 为锚点离网格背面的固定偏置）。
  anchorFromGridZMm: 24,
  // 固定软垫前面（锚点坐标系，朝离墙方向为正）。
  padFrontMm: 33.4,
  // 参考夹持状态（厚 6 mm）下展板背面位置；夹口深度 = jawBack - padFront = 7 mm。
  jawBackMm: 40.4,
  referenceExhibitMm: 6,
  gapMm: 7,
  guideDiameterMm: 6,
  guideLengthMm: 30,
  // 梯柱横档机械间距（25 mm）：与 48 mm 布局网格互质，两套数据永不换算。
  rungPitchMm: 25,
  // 滑块（前压板 + 圆导柱 + 轴尾防拔）允许的最大外移行程。
  maxOutwardTravelMm: 7,
  // 可夹持展板厚度范围（含）。
  exhibitRangeMm: [1, 12],
  nodeSizeMm: 48,
};

// 五个薄界面类型按真实夹持机构渲染；其余 mount≥2 模块的派生节点
// 仍渲染真实节点装配，但滑块停在参考位（它们不是被夹持的平面展品）。
export const isExhibitType = (type) =>
  ['panel', 'pegboard', 'mesh', 'metal', 'rope'].includes(type);

export function validThickness(t) {
  const [lo, hi] = CLAMP.exhibitRangeMm;
  return Number.isFinite(t) && t >= lo && t <= hi;
}

// 厚度驱动滑块：背面固定在 jawBack（夹口恒定 7 mm），前压板随厚度整体外移
// (t - 参考厚度) 始终贴住展板正面。行程在范围内为 [-5, +6] mm，全程不超过
// maxOutwardTravelMm；展板中心相对参考位置仅偏移 ±(t-6)/2（最大 3 mm），
// 在墙面比例下视觉稳定。范围外由 validThickness 拒绝。
export function sliderOffsetMm(t = CLAMP.referenceExhibitMm) {
  return t - CLAMP.referenceExhibitMm;
}

// 展板在锚点坐标系中的位置：背面固定 ⇒ 夹口深度恒定，正面随厚度外移，
// 中心偏差对称且不超过 3 mm（受 maxOutwardTravel 约束的中心稳定方案）。
export const exhibitBackMm = () => CLAMP.jawBackMm;
export const exhibitFrontMm = (t) => CLAMP.jawBackMm + t;
export const exhibitCenterMm = (t) => CLAMP.jawBackMm + t / 2;

// 挂点角色：底行从下方承托展板，顶行从上方限制/压住，其余为中间限位。
// 单行挂点（如横杆坐在两个节点上）一律视为下承托。
export function mountRole(gy, loRow, hiRow) {
  if (gy <= loRow) return 'lower-support';
  if (hiRow > loRow && gy >= hiRow) return 'upper-limit';
  return 'middle';
}
