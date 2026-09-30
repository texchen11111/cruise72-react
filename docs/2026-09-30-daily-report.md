# 2026-09-30 改动梳理报告

当天共 8 个提交，按主题归为四组：工作区 UI 改版、梯柱机械层升级、三层架构重构、依赖与资源整理。全部改动测试与构建验证通过。

## 提交清单

| 时间 | 提交 | 主题 |
| --- | --- | --- |
| 14:45 | `946afe6` | UI：悬浮面板工作区 + 场景效果图弹层 |
| 15:21 | `64410dc` | 机械：连续横档梯柱网格（V4.11） |
| 15:50 | `d1ac921` | 机械：格内吸附取代渲染相位（V4.11 补充） |
| 15:51 | `5c96fa2` | 资产：manifest 源路径修正 |
| 18:13 | `47f83fb` | 架构：model/scene 拆为 core/geometry/renderer（V4.12） |
| 18:14 | `64cb9dd` | 构建：three 改走 npm，移除 vendor/importmap |
| 18:14 | `fb36008` | 清理：删除过期 rhino 规格与旧版本归档 |
| 18:14 | `03ab900` | 构建：dist 重新生成 |

---

## 一、工作区 UI 改版（`946afe6`，+1271/−111 行）

把原来的固定侧栏改为**以三维画布为优先**的工作区：

- 新增 `HoverPanel.jsx`：左（模块/场景/说明）、右（设置）两组悬浮面板，Esc 收起，画布获得最大视觉优先级
- 新增 `RenderOverlay.jsx`：「场景效果图」弹层，展示氛围渲染图
- 新增 `ScenePicker.jsx`：预设/展陈切换从场景中独立为组件
- 新增 `src/styles/workspace.css`（662 行）与 `docs/canvas-workspace.md`
- `tests/react.mjs` 增加对应 DOM 交互测试（+107 行）

**遗留记录缺口**：此改动未在 VERSION_HISTORY 立条目（现有记录从 V4.7 直接跳到 V4.11）。

## 二、梯柱机械层升级（`64410dc` + `d1ac921` + `5c96fa2`）

### 2.1 连续横档梯柱网格（V4.11）

- 源文件换为新版 `梯柱 节点.3dm`（sha `0db9c004…`）：段高 600 mm、横档 25 mm 间距**全程连续**，跨段无 145 mm 无档区
- 导出件数 68 → 93（梯柱 50 = 2 主轨 + 48 横档），三角面 6304 → 10692
- 源文件两段 600 mm 顶点级周期重复（±0.0002 mm），渲染只取第一段零件集按段高平铺，避免跨段重复实例化
- 主轨/横档按 z 向跨度自动判材（轨银/档深），不再按零件名硬编码
- 首次引入横档渲染相位 `rungRenderPhaseMm = 12`（后于 2.2 撤销）

### 2.2 格内吸附取代渲染相位（V4.11 当日补充）

这是当天最有技术含量的改动，解决 **48 与 25 互质**导致的锚定偏差：

- 分析结论：纯格点锚定 worst 12.5 mm（互质理论上限）；全局渲染相位对布局后真实挂载行集（29 个不同行）无解（最优 worst 仍 11.5 mm）→ 撤销渲染相位，横档回归 Rhino 工程位置
- 实施方案三「格内吸附」：新增 `rungSnapShiftMm(a, items)` 对模块（含独立节点）做 y 向 minimax 微调（|s| ≤ 12.5 mm，步长 0.05 mm），`clamp.js` 新增 `rungFirstCenterMm = 12.5`
- 实测全部预设/展陈 103 处挂点：**残差 worst 5.5 mm / avg 2.66 mm**；按占位钩口包络（高 7 mm、横档厚 4.8 mm、设计咬合中心 15 mm）计算，背钩-横档保持 ≥ 2.0 mm 实体重叠，视觉上不脱钩
- 渲染与导出来源统一：`moduleGeometry.js` 渲染时按物品施加微调；导出 `connection_nodes.anchor_world_mm[1]` 含微调量
- Rhino 资产统一收拢到 `assets/rhino/`（source + generated + manifest）

### 2.3 manifest 源路径修正（`5c96fa2`）

资产搬迁后 manifest.json 的 sourcePath 指向修正，1 行改动。

## 三、三层架构重构（`47f83fb`，+1443/−1650 行，41 文件）

### 3.1 动机

原结构按「是否 import three」二分（`model/` vs `scene/`），导致两类问题：

1. `scene/models/`（三维网格）与 `src/model/`（领域模型）撞「模型」一词
2. `scene/` 的「场景」与产品里预设的「场景」（PRESETS/EXHIBITIONS/ScenePicker）撞词
3. 更本质的：three-importing 文件里混着**纯派生**（物品→网格）与**运行时**（渲染器、相机、指针），副作用边界被埋在目录内部

### 3.2 原则：按副作用分层

测试结构证明了真实边界——`tests/grid.mjs`、`tests/store.mjs` 纯 Node 零 mock 可跑，`tests/scene.mjs` 需要 jsdom+WebGL mock：

```
core       纯领域规则：48 mm 网格、模块资料、挂接/碰撞/吸附    （零 three，纯 Node 可测）
geometry   纯派生：物品 → BufferGeometry 的纯函数              （只依赖 core + three）
renderer   运行时：renderer 生命周期、相机灯光、材质、指针、动画、DOM 兜底
store      状态骨架 + 动作（moveItem/addItem/…）
```

依赖方向单向：`core ← geometry ← renderer`；下层禁止向上引用（已写入 AGENTS.md）。

### 3.3 具体改动

- `src/model/`（862 行 index）→ `src/core/`：`constants`、`modules`（含 MODULES 全部后置覆盖，执行顺序原样保留）、`presets`、`grid`、`assembly`；交互点收拢 `core/mount/`（`mounting` 挂接规则 → `rungs` 横档吸附 → `clamp` 夹持机械）
- `src/scene/` 按边界拆为 `src/geometry/`（`moduleGeometry`、`primitives`、`models/`）与 `src/renderer/`（`createPlannerScene`、`environment`、`materials`、`pointer`、`animation`、`fallbackPlanner`）
- `src/store/` 拆为 `layoutActions`（布局操作）/`sceneActions`（场景切换与自动播放）/`exportData`（导出语义），动作模块经 `{ getState, update, toast, changed }` 上下文注入，uid 与计时器归 index 骨架
- 新增 `src/hooks/usePlanner.js`：useSyncExternalStore 订阅抽成统一 hook

### 3.4 决策记录（命名讨论）

- **目录名 `mount/`**：在 `detail/`（与详情页撞义）、`behavior`（行为是 store 动作的属性，会抹掉刚立起的纯/脏边界）等候选中，选与全库 `mountPoints`/`mounted`/`mountingKey` 词根一致的 `mount`
- **`presets.js` 命名**：文件除 PRESETS 外还含 EXHIBITIONS、`item()`、`PILLAR_COLUMNS`，叫 `presets` 只覆盖约三分之二内容；当日收尾时已改名 `scenes.js`（见 V4.12 补充），导出名不变、外部零感知
- **历史版本记录不改写**：VERSION_HISTORY 中 5 处旧路径均为历史条目，描述的是当时事实

### 3.5 零行为变更保障

- 函数体一行未动，纯移动 + import 更新
- `core/index.js` 保留兼容性 re-export，39 个导出名与拆分前逐一核对一致
- 5 个测试文件只改路径字符串，断言逻辑未变；git 识别大部分移动为 rename（相似度 95–100%）

## 四、依赖与资源整理（`64cb9dd` + `fb36008` + `03ab900`）

- **three 走 npm**：`three@0.170.0` 进入 dependencies（版本不变），删除 `vendor/` 三件套（−56k 行）、index.html 的 importmap、vite 的 alias/external/copy 机制；开发与构建统一走标准打包
- **资源清理**：删除 `public/models/rhino/` 重复规格（资产已收拢至 `assets/rhino/`）、`versions/` 下 8 份早于 git 历史的源码归档；新增 `assets/rhino/README.md` 记录 source→generated→bundle 资产管线（已修正为 `src/geometry/models/` 新路径）
- **dist 重新生成**：上述改动后的构建产物

## 验证汇总

| 项 | 结果 |
| --- | --- |
| 网格断言（tests/grid.mjs） | 1003 项通过，含两份 assembly.json 字节一致性 + 3dm 哈希校验 |
| store / React DOM（tests/store.mjs、react.mjs） | 通过（不可变快照、增删移动、预设、导出、自动播放、悬浮面板交互） |
| Three.js 几何 / 场景生命周期（tests/scene.mjs、scene-lifecycle.mjs） | 通过（17 类几何、吸附残差 ≤ 5.5 mm、拖拽、清理） |
| 生产构建 | 通过（chunk > 500 kB 提示为拆分前既有，three 入包后体积由 gzip 273 kB 变化见 dist） |
| 工作区状态 | 8 个提交后 `git status` 全干净 |

## 未决项与观察

1. ~~VERSION_HISTORY 缺口~~（当日已补记为 V4.10）；~~`presets.js` 命名~~（当日已改名 `scenes.js`）
2. ~~dist 纳入版本控制~~（当日已移出版本库：`dist/` 入 .gitignore，部署通道均读本地目录不受影响；保留"部署平台是否有构建步骤"的一次实部署确认）
3. **格内吸附容许值**：残差 worst 5.5 mm 的最终容许值待 Rhino 承托弧加工尺寸确认（V4.11 已列未决）
