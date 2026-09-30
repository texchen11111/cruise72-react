import { CLAMP } from './mount/clamp.js';

const item = (id, type, gx, gy, state = 0, gz = 0) => ({
  id,
  type,
  gx,
  gy,
  gz,
  state,
  color: '#3158e8',
  intensity: 65,
  temperature: 3200,
  // 展板厚度（机械层参数，毫米）：旧数据缺省按 Rhino 参考厚度 6 mm。
  exhibitMm: CLAMP.referenceExhibitMm,
});
// 梯柱列：所有预设共享的四根基底轨条（id 保持一致，切换场景时视为固定设施）。
// 布局与参考视频一致：两组挂接区域、柱距 15 格（720 mm，视频标注“柱距 714 mm”）。
export const PILLAR_COLUMNS = [3, 18, 33, 48];
const pillarItems = () => PILLAR_COLUMNS.map((gx, i) => item('p' + (i + 1), 'pillar', gx, 0));
export const EXHIBITIONS = [
  {
    id: 'flat',
    name: '平面悬展',
    tag: '夹持 / 留白',
    desc: '以48 mm节点框选航线摄影与海报，灯具和展签共同组织阅读顺序。',
    items: [
      item('a', 'panel', 3, 27),
      item('b', 'panel', 18, 24),
      item('c', 'panel', 33, 27),
      item('d', 'lamp', 8, 44, 1),
      item('e', 'lamp', 28, 44, 1),
      item('f', 'sign', 27, 14),
      ...pillarItems(),
    ],
  },
  {
    id: 'shelves',
    name: '层架陈列',
    tag: '承托 / 分层',
    desc: '沿用两组灯具与展签，通过节点、背梁和承托臂组织高低层板、浅托盘与透明展柜。',
    items: [
      item('s1', 'shelf', 3, 25),
      item('s2', 'shelf', 3, 34),
      item('v1', 'cabinet', 18, 24),
      item('t1', 'tray', 34, 25),
      item('d', 'lamp', 8, 44, 1),
      item('e', 'lamp', 28, 44, 1),
      item('f', 'sign', 27, 14),
      ...pillarItems(),
    ],
  },
  {
    id: 'reading',
    name: '翻阅展示',
    tag: '倾斜 / 取阅',
    desc: '节点支撑倾斜书托，底部挡边承托图录；层板容纳备用书刊，横杆延续统一连接基准。',
    items: [
      item('r1', 'bookrest', 3, 24),
      item('r2', 'bookrest', 18, 24),
      item('s1', 'shelf', 34, 25),
      item('h1', 'rail', 3, 36),
      item('d', 'lamp', 8, 43, 1),
      item('e', 'lamp', 28, 43, 1),
      item('f', 'sign', 27, 14),
      ...pillarItems(),
    ],
  },
  {
    id: 'mixed',
    name: '混合策展',
    tag: '图像 / 实物 / 书刊',
    desc: '以一段航线为主题，将摄影、地方工艺与旅行图录组合成有主次的展陈。节点和附件可随主题再次使用。',
    items: [
      item('a', 'panel', 3, 27),
      item('v1', 'cabinet', 18, 24),
      item('r2', 'bookrest', 34, 25),
      item('t1', 'tray', 3, 16),
      item('d', 'lamp', 8, 44, 1),
      item('e', 'lamp', 28, 44, 1),
      item('f', 'sign', 27, 14),
      ...pillarItems(),
    ],
  },
];
export const PRESETS = [
  {
    id: 'gallery',
    name: '展陈空间',
    tag: '观看 / 阅读 / 发现',
    desc: EXHIBITIONS[0].desc,
    ambient: 'day',
    items: EXHIBITIONS[0].items,
  },
  {
    id: 'workshop',
    name: '共创空间',
    tag: '动手 / 共创',
    desc: '活动台预留完整折叠空间；同一套网格容纳材料、照明与软质面板。',
    ambient: 'day',
    items: [
      item('a', 'worktop', 3, 16, 1),
      item('b', 'worktop', 34, 16, 1),
      item('c', 'shelf', 18, 24),
      item('d', 'sign', 7, 36),
      item('e', 'lamp', 47, 44, 1),
      item('f', 'acoustic', 18, 33),
      ...pillarItems(),
    ],
  },
  {
    id: 'market',
    name: '交流市集',
    tag: '交换 / 相遇',
    desc: '展柜与层板按整数格重新组合，改变展示和取放方式。',
    ambient: 'day',
    items: [
      item('a', 'cabinet', 3, 30),
      item('b', 'shelf', 3, 20),
      item('c', 'cabinet', 34, 30),
      item('d', 'shelf', 34, 20),
      item('e', 'sign', 27, 44),
      item('f', 'worktop', 18, 14, 1),
      ...pillarItems(),
    ],
  },
  {
    id: 'lounge',
    name: '休憩空间',
    tag: '阅读 / 放松',
    desc: '降低照明亮度，以软质面板组织休憩界面；香氛默认关闭。',
    ambient: 'night',
    items: [
      item('a', 'acoustic', 3, 24),
      item('b', 'acoustic', 34, 24),
      item('c', 'lamp', 8, 43, 1),
      item('d', 'lamp', 48, 43, 1),
      item('e', 'scent', 28, 9),
      item('f', 'shelf', 18, 19),
      item('g', 'sign', 27, 44),
      ...pillarItems(),
    ],
  },
];

export { item };
