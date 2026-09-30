import { MODULES } from './modules.js';

// Shared conceptual bill of components. Nodes belong to each assembly's envelope.
export function assembly(type) {
  const m = MODULES[type];
  return {
    nodes: m.mount,
    connector: {
      block: '背部适配接口',
      panel: '夹持轴与背部适配板',
      rail: '横杆 × 1',
      shelf: '背梁 + 承托臂 × 2',
      tray: '背梁 + 承托臂 × 2',
      bookrest: '背梁 + 倾斜支撑 × 2',
      cabinet: '刚性背框 + 柜体连接件',
      lamp: '转向接头 + 独立低压线',
      scent: '芯盒接口 + 独立低压线',
      sign: '换片框接口',
      worktop: '背架 + 锁定支撑臂',
      acoustic: '轻框连接件',
      pillar: '墙体固定 / 梯柱基底',
      pegboard: '洞洞板背框 + 四角节点',
      mesh: '张紧边框 + 四角节点',
      metal: '金属背板 + 四角节点',
      rope: '吊点边框 + 系绳节点',
    }[type],
    surface: {
      block: '无，基础连接单元',
      rail: '无，可接入兼容附件',
      panel: '薄型展板',
      shelf: '可换层板',
      tray: '带挡边浅托盘',
      bookrest: '倾斜展示板 + 挡边',
      cabinet: '层板 + 背板 + 透明围护',
      lamp: '定向灯头',
      scent: '可拆香氛芯盒',
      sign: '信息片',
      worktop: '折叠操作面',
      acoustic: '软质面板',
      pillar: 'Rhino V3 梯柱',
      pegboard: '规则孔阵列界面',
      mesh: '夹持网面',
      metal: '薄金属面板',
      rope: '绳网与吊点',
    }[type],
  };
}
export function compareLayouts(before, after) {
  const same = after.filter((a) => before.some((b) => b.id === a.id && b.type === a.type));
  return {
    retained: same.length,
    moved: same.filter((a) => {
      const b = before.find((b) => b.id === a.id);
      return ['gx', 'gy', 'gz'].some((k) => a[k] !== b[k]);
    }).length,
    added: after.length - same.length,
    removed: before.length - same.length,
    nodes: same.reduce((n, a) => n + MODULES[a.type].mount, 0),
  };
}
