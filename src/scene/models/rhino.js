import * as THREE from 'three';
import assembly from './rhino/assembly.json';
import { MM, sliderOffsetMm, sliderRetractMm } from '../../model/clamp.js';

// Rhino V3 真实网格（毫米 → 米）。导出脚本 scripts/export-rhino.py 从
// models/rhino/source/ladder-node.3dm 提取，双写到 models/rhino/generated/
// 与本目录，单一来源、可复现；禁止用立方体/圆柱近似替代。
export const RHINO_V3 = {
  source: 'ladder-node.3dm（原件：梯柱 节点.3dm）',
  units: 'Millimeters',
  partCount: assembly.parts.length,
  triangleCount: assembly.parts.reduce((n, p) => n + p.indices.length / 3, 0),
  node: {
    widthMm: 48,
    padFrontMm: 33.4,
    jawBackMm: 40.4,
    guideDiameterMm: 6,
    guideLengthMm: 30,
    maxOutwardTravelMm: 7,
  },
  pillar: { widthMm: 26.4, depthMm: 28.8, segmentHeightMm: 720, rungPitchMm: 25 },
};

// 网格模板只建一次，全部实例共享；dispose 时通过 userData.rhinoShared 跳过。
const geometryCache = new Map();
function partGeometry(part) {
  let geometry = geometryCache.get(part.id);
  if (geometry) return geometry;
  geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(part.positions.length);
  for (let i = 0; i < positions.length; i++) positions[i] = part.positions[i] * MM;
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(part.normals), 3));
  geometry.setIndex(part.indices);
  geometry.userData.rhinoShared = true;
  geometryCache.set(part.id, geometry);
  return geometry;
}

const partsByRole = (role) => assembly.parts.filter((p) => p.role === role);

function materialForPart(part, mats) {
  if (part.role === 'backplate') return mats.dark;
  if (part.role === 'cartridge') return mats.orange;
  if (part.role === 'slider') {
    if (part.name.includes('圆导柱')) return mats.silver;
    if (part.name.includes('轴尾防拔')) return mats.dark;
    // 前压板用品牌蓝：压在展板正面时必须可见（ Rhino 参考里同为蓝色），
    // 不能用与展板同色的白。
    return mats.blue;
  }
  // 梯柱：主轨银色，横档深色。
  return part.name === 'ladder-part-24' ? mats.silver : mats.dark;
}

function addRoleMeshes(parent, role, mats) {
  for (const part of partsByRole(role)) {
    const mesh = new THREE.Mesh(partGeometry(part), materialForPart(part, mats));
    mesh.userData.rhinoPart = part.name;
    parent.add(mesh);
  }
}

// 梯柱：Rhino 段高 720 mm，按模块高度向上堆叠到覆盖包络；从包络底面起算，
// 顶段允许超出包络（通长到顶），工程尺寸不做缩放。
export function buildRhinoPillar(g, hMeters, mats) {
  const segmentHeight = RHINO_V3.pillar.segmentHeightMm * MM;
  const count = Math.max(1, Math.ceil(hMeters / segmentHeight));
  const bottom = -hMeters / 2;
  for (let i = 0; i < count; i++) {
    const segment = new THREE.Group();
    // 导出网格在段内 y ∈ [60, 660] mm：把段底对齐到 stackBottom + i*段高。
    segment.position.y = bottom + i * segmentHeight - 60 * MM;
    addRoleMeshes(segment, 'pillar', mats);
    g.add(segment);
  }
}

// 节点装配：背板（挂钩，始终向下）+ 机芯（允许转向）+ 滑块（随厚度整体移动）。
// 锚点是无几何 Object3D，世界位置 = (格中心 x, 格中心 y, gz*48+24 mm)，
// 测试与导出都以此对齐。上挂点机芯绕 z 轴转 180°，背板不转。
// retract = true 时滑块完全收回（压板与机芯前面齐平，节点呈完整立方体），
// 用于不夹持平面展具、只连接其他模块的节点。
export function buildRhinoNode(g, x, y, z, opts = {}) {
  const { role = 'standalone', thicknessMm = 6, point = null, mats, retract = false } = opts;
  const node = new THREE.Group();
  node.position.set(x, y, z);
  addRoleMeshes(node, 'backplate', mats);
  const mechanism = new THREE.Group();
  mechanism.userData.mechanism = { role, ownerId: opts?.ownerId ?? null, retract };
  if (role === 'upper-limit') mechanism.rotation.z = Math.PI;
  addRoleMeshes(mechanism, 'cartridge', mats);
  const slider = new THREE.Group();
  const offsetMm = retract ? sliderRetractMm() : sliderOffsetMm(thicknessMm);
  slider.position.z = offsetMm * MM;
  slider.userData.slider = { offsetMm, ownerId: opts?.ownerId ?? null, retract };
  addRoleMeshes(slider, 'slider', mats);
  mechanism.add(slider);
  node.add(mechanism);
  const anchor = new THREE.Object3D();
  if (point) anchor.userData.mountPoint = point;
  node.add(anchor);
  g.add(node);
  return node;
}
