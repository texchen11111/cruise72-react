# 72+ 邮轮模块配置器

基于 React、Three.js 和 50 mm 网格规则的墙面模块配置器。用户可以在梯柱墙上组合展板、展柜、灯具、层板等模块，调整位置和尺寸，并导出配置 JSON。

这是一个空间交互原型。页面中的挂接、承力、照明和香氛效果不代表最终工程验证结果。

## 项目目录

```text
.
├── src/                  应用源码
│   ├── components/       React 界面组件
│   ├── core/             50 mm 领域规则：网格、模块资料、挂接、碰撞（纯逻辑，零 three）
│   ├── geometry/         三维网格派生：物品 → BufferGeometry 的纯函数（依赖 core + three）
│   ├── hooks/            React 订阅方案状态
│   ├── renderer/         Three.js 渲染运行时：renderer、相机灯光、材质、动画和指针交互
│   ├── services/         浏览器服务和外部操作预留目录
│   ├── store/            方案状态和用户操作
│   ├── styles/           全局样式和工作区样式
│   ├── App.jsx           React 页面组装
│   └── main.jsx          React 启动入口
├── assets/               原始设计资料和 Rhino 模型源文件
├── public/               网站静态资源，例如场景概念图
├── scripts/              Rhino 等模型资源的导出脚本
├── tests/                网格、状态、React 和 Three.js 测试
├── dist/                 构建生成的网站文件，不直接编辑
├── versions/             历史源码快照，不参与网站运行
├── package.json          npm 依赖和命令
├── vite.config.js        Vite 开发与构建配置
├── wrangler.jsonc        Cloudflare 部署配置
└── VERSION_HISTORY.md    版本和设计迭代记录
```

`hooks/usePlanner.js` 将方案状态连接到 React；`services/` 当前作为职责边界预留目录。

## 核心分工

```text
React components  →  store  →  core
                         ↘
                           renderer / Three.js Canvas
                              ↑
                           geometry（core → 网格的纯派生）
```

- `components/` 负责页面、面板、输入和用户可见状态。
- `store/` 负责当前方案状态，以及添加、移动、删除、缩放和场景切换等操作。
- `core/` 负责纯业务规则：50 mm 网格、模块尺寸、父子挂接、碰撞、吸附和导出语义；不 import three，纯 Node 可测。
- `geometry/` 负责把 core 的物品派生为三维网格（纯函数，无渲染器、无 store 订阅）；`placement.js` 统一模型生成、状态更新和动画使用的实际装配位置，避免动画覆盖吸附偏移。
- `renderer/` 负责把模型结果渲染为 Three.js 场景并响应指针交互，不拥有 React 页面状态。
- `assets/rhino/` 是 Rhino 原始资料；`src/geometry/models/rhino/assembly.json` 是打包使用的生成网格。

修改时保持以下边界：界面逻辑放 React，业务规则放 core/store，网格派生放 geometry，三维画布逻辑放 renderer。不要在组件中重新实现碰撞或尺寸规则，也不要让 Three.js 直接改 React 状态。

## 运行项目

需要 Node.js 20.19+ 或 22.12+。

```sh
npm ci
npm run dev
```

然后打开终端显示的本机地址，通常是 `http://localhost:5173/`。不要直接双击 `index.html`。

Three.js 0.170.0 由 `package.json` 和 `package-lock.json` 管理，不提交 `node_modules/`。

## 常用命令

```sh
npm test          # 运行全部自动测试
npm run build     # 生成 dist/ 部署文件
npm run preview   # 预览最近一次构建结果
```

提交源码前至少运行：

```sh
npm ci
npm test
npm run build
```

测试覆盖网格边界、碰撞、父子挂接、状态操作、导出、Three.js 几何、动画和场景生命周期。自动测试不能替代真实浏览器中的 WebGL 画面检查。

## 模型规则

- 布局单位为 50 mm，网格大小为 `58 × 58 × 24` 格，宽高跨度均为 2900 mm。
- 标准展板占位为 `14 × 11 × 1` 格（700 × 550 × 50 mm），实体厚度单独设置；梯柱为 48 格高（2400 mm），相邻柱距 15 格（750 mm）。
- 梯柱、节点和拓展模块按父子关系挂接。
- 挂接点是由模块和梯柱派生的数据，不重复计入模块清单。
- 移动、缩放、删除会校验网格边界、占位冲突和挂接有效性。
- 50 mm 布局网格与 Rhino 的毫米机械参数分开管理，禁止互相换算替代。Rhino 节点实体仍为 48 mm，梯柱横档间距仍为 25 mm，本次没有修改节点机构或原始资产。
- 保留横档吸附算法；50 mm 网格下，挂载构件统一沿 Y 微调 −12.5 mm，各挂点对横档中心的残差为 0。格坐标和占位不受微调影响。
- 展板厚度属于机械参数，当前有效范围为 1–12 mm。
- 导出 JSON 同时包含模块、格坐标、尺寸、挂接点和机械参数。
- 导出版本为 `grid50-1`，`grid.unit_mm` 为 50。按迁移约定保留导出原点 `[10, 10, 0]` mm 和锚点 X/Y 的 +10 mm 偏移；`anchor_world_mm` 使用这一导出坐标系，不是以墙中心为原点的 Three.js 坐标。旧 `grid48-1` 文件的格数乘 48 mm，不能直接按新版 50 mm 解读。

## 主要修改位置

| 需求 | 主要位置 |
| --- | --- |
| 页面和面板 | `src/components/`、`src/App.jsx` |
| React 状态订阅 | `src/hooks/usePlanner.js` |
| 模块资料和场景预设 | `src/core/modules.js`、`src/core/scenes.js` |
| 网格、碰撞 | `src/core/grid.js` |
| 挂接、横档吸附和夹持机械 | `src/core/mount/`（`mounting.js`、`rungs.js`、`clamp.js`） |
| 装配物料清单 | `src/core/assembly.js` |
| 添加、移动、删除 | `src/store/layoutActions.js` |
| 场景切换和自动播放 | `src/store/sceneActions.js` |
| 导出 | `src/store/exportData.js` |
| 三维模块几何（纯派生） | `src/geometry/moduleGeometry.js`、`src/geometry/models/` |
| 渲染器、相机、灯光和墙面环境 | `src/renderer/createPlannerScene.js`、`src/renderer/environment.js` |
| 鼠标拖动和尺寸控制点 | `src/renderer/pointer.js` |
| 动画 | `src/renderer/animation.js` |
| 页面样式 | `src/styles/` |
| Rhino 资源转换 | `scripts/export-rhino.py`、`assets/rhino/` |

源码按「纯逻辑 → 纯派生 → 运行时」分为三层：`src/core/`（50 mm 领域规则，零 three 依赖，纯 Node 可测）、`src/geometry/`（物品 → 三维网格的纯函数派生，只依赖 core + three）、`src/renderer/`（Three.js 渲染运行时，管 renderer 生命周期、相机灯光、指针交互与 DOM 兜底）。依赖方向单向：`core ← geometry ← renderer`。各层 `index.js` 仅保留兼容性 re-export，导出面与拆分前一致；组件和测试仍从 `index.js` 导入。`src/core/README.md` 有 core 内部的职责分层说明，`src/services/` 目前为预留空目录。

## 发布注意事项

- `dist/` 是构建产物，修改源码后重新构建，不手工修改其中的文件。
- Cloudflare 配置使用现有的 `wrangler.jsonc` 和 Worker 项目，不要创建替代项目。
- `.openai/hosting.json` 中的 Sites 项目 ID 和访问配置必须保留。
- `versions/` 只用于历史留档，不会被 Vite 打包，也不是网站静态资源。
- 版本变化和设计决策记录在 [VERSION_HISTORY.md](VERSION_HISTORY.md)。

## 维护原则

每次只处理一个明确目标，先查看差异，再运行测试和构建。涉及模型尺寸、挂接、碰撞或导出时，要同时检查预设场景、Three.js 几何和测试。React 负责界面，Three.js 只负责 Canvas；新增事件、动画和 WebGL 资源时必须提供对应清理逻辑。

详细项目约束见 [AGENTS.md](AGENTS.md)。
