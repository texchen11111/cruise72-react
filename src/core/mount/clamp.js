// 机械参数层：Rhino V3 节点的真实机器尺寸（毫米）。
// 这一层与 50 mm 布局网格刻意分离：格坐标（布局规则）和机械尺寸（加工配合）
// 是两套数据，禁止互相换算。25 mm 横档间距、9 mm 窄颈、Ø6 导柱等
// 只存在于本层；网格层只知道 50 mm 单元，真实节点实体仍为 48 mm。
export const MM = 0.001;

export const CLAMP = {
  // 节点锚点面：世界 z = gz * PITCH * 1000 + 24 mm（固定机械偏置）。
  anchorFromGridZMm: 24,
  // 固定软垫前面（锚点坐标系，朝离墙方向为正）。展板背面落在软垫面上，
  // 由软垫 + 前压板夹持（见图1：展板背面贴节点壳体、蓝压板压在正面）。
  padFrontMm: 33.4,
  // 滑块零位面：Rhino 参考状态（“6 mm 夹持状态”）下滑块后缘位置。
  // 压板厚 5.5，占 40.4..45.4；它不是展板位置，只是滑块自身的基准。
  jawBackMm: 40.4,
  referenceExhibitMm: 6,
  // 夹口深度 = jawBack - padFront = 7 mm：滑块零位比软垫面前出 7 mm，
  // 因此夹持 t mm 展板所需滑块偏移 = t - 7。
  gapMm: 7,
  guideDiameterMm: 6,
  guideLengthMm: 30,
  // 梯柱横档机械间距（25 mm）：50 mm 网格为其两倍，机械尺寸独立管理。
  rungPitchMm: 25,
  // 横档中心距段底 12.5 mm（源文件两段 600 mm 顶点级周期重复，工程位置恒定）。
  rungFirstCenterMm: 12.5,
  // 滑块真实行程限制（锚点坐标系，相对零位）：导柱内端止挡不得脱出机芯
  // （止挡 z = 10.4 + offset ≥ 机芯背面 2.4 ⇒ offset ≥ -8），压板不得撞上
  // 软垫（压板背面 = 40.4 + offset ≥ 33.4 ⇒ offset ≥ -7），取两者更严格者；
  // 外拉由导柱与机芯侧壁孔的配合长度限制在 +7。⇒ offset ∈ [-7, +7]，
  // 对应可夹厚度 0–14 mm，产品限定 1–12 mm。
  maxOutwardTravelMm: 7,
  // 可夹持展板厚度范围（含）。受滑块行程 ±7 mm 约束：t = offset + 7。
  exhibitRangeMm: [1, 12],
  nodeSizeMm: 48,
};

// 五个薄界面类型按真实夹持机构渲染；其余 mount≥2 模块的派生节点
// 仍渲染真实节点装配，但滑块收回为完整立方体（它们不是被夹持的平面展品）。
export const isExhibitType = (type) =>
  ['panel', 'pegboard', 'mesh', 'metal', 'rope'].includes(type);

export function validThickness(t) {
  const [lo, hi] = CLAMP.exhibitRangeMm;
  return Number.isFinite(t) && t >= lo && t <= hi;
}

// 厚度驱动滑块（夹持状态）：展板背面落在软垫前面 33.4，前压板背面须贴住
// 展板正面（33.4 + t）。压板背面 = 滑块零位 40.4 + offset，故 offset = t − 7。
// t = 6（Rhino 参考厚度）时 offset = −1，与 3dm 里“6 mm 夹持状态”网格相差 1 mm
// 的建模余量；导柱随滑块整体移动，尖端 = 展板正面，端面齐平藏于压板后。
// 行程 ±7 mm 是真实机构限制（见 CLAMP.maxOutwardTravelMm 注释），
// 范围外由 validThickness 拒绝。
export function sliderOffsetMm(t = CLAMP.referenceExhibitMm) {
  return t - CLAMP.gapMm;
}

// 非夹持状态（节点连接其他模块或独立放置）：滑块完全收回（offset = −7），
// 压板背面与软垫/机芯前面（33.4）齐平，节点外观收拢为完整立方体。
export const sliderRetractMm = () => -CLAMP.maxOutwardTravelMm;

// 展板在锚点坐标系中的位置：背面固定在软垫面 33.4（贴合有支撑），
// 正面随厚度外移，中心偏差对称且不超过 3 mm。
export const exhibitBackMm = () => CLAMP.padFrontMm;
export const exhibitFrontMm = (t) => CLAMP.padFrontMm + t;
export const exhibitCenterMm = (t) => CLAMP.padFrontMm + t / 2;

// 挂点角色：底行从下方承托展板，顶行从上方限制/压住，其余为中间限位。
// 单行挂点（如横杆坐在两个节点上）一律视为下承托。
export function mountRole(gy, loRow, hiRow) {
  if (gy <= loRow) return 'lower-support';
  if (hiRow > loRow && gy >= hiRow) return 'upper-limit';
  return 'middle';
}
