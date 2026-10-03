# 任务简报：布局网格 48 mm → 50 mm 全站迁移

> 交给 Codex 执行。本文档自足，无需其他上下文。
> 基线提交：`baa0e9b`（main，工作区干净）。执行前请先 `git log --oneline -1` 确认。

## 一句话任务

把整套布局逻辑从 48 mm 网格迁移到 50 mm 网格。**梯柱 Rhino 模型不变**（25 mm 横档照旧），**节点夹持模型后续由项目方另行改版，本次不动 `clamp.js` 的节点机构参数**。

## 为什么做

48 与 25 互质（gcd=1），格点锚点对横档的偏差 worst 12.5 mm，当前靠 `core/mount/rungs.js` 的格内 minimax 微调压到 5.5 mm。50 = 2 × 25 整除，迁移后**所有挂点锚点精确落在横档中心，残差恒为 0**，微调机制自然退化。附带收益：2900 mm 墙面 ÷ 50 = 58 格整除（48 mm 时代 60 格 = 2880 mm 留 20 mm 缝）；展板 note 记载的「700 × 550 mm 板材」在 50 mm 网格下是 14 × 11 格的精确值（48 mm 下 720 × 576 只是占位）。

## 仓库结构（三层，依赖单向 core ← geometry ← renderer）

```
src/core/        领域规则（零 three 依赖）：constants / modules / scenes / grid / assembly
  mount/         交互点层：mounting（挂接）→ rungs（横档吸附）→ clamp（夹持机械）
src/geometry/    纯派生：moduleGeometry / primitives / models（rhino.js 是真实毫米网格，勿动）
src/renderer/    Three.js 运行时：createPlannerScene / environment / materials / pointer / animation / fallbackPlanner
src/store/       状态：index（骨架）/ layoutActions / sceneActions / exportData
```

## 改动清单（按文件）

### 1. `src/core/constants.js`（根上的改动）

```js
// 现值 → 目标值
PITCH = 0.048 → 0.05
GRID = [60, 60, 24] → [58, 58, 24]     // 58×50 = 2900 mm，与墙精确对齐；z 向维持 24 格
ORIGIN = [-1.44, 0.01, 0] → [-1.45, 0.01, 0]  // -(58×50)/2 = -1450 mm，墙中心
```

### 2. `src/core/modules.js`

- `sizes` 表：`panel: [15, 12, 1]` → `[14, 11, 1]`（唯一有文档化毫米目标的模块，700×550 精确）；**其余模块格数全部不变**（尺寸随 PITCH 自然 +4.2%，可接受）。
- 文案中的 48 字样：`en: 'UNIT / 48'`→`'UNIT / 50'`、`'48 mm 基础单元'`→`'50 mm 基础单元'`、`'48 mm 基础节点'`、`48 mm 节点 × n`、`外包络以48 mm整数格计`、`端部48 mm节点`。注意 `MODULES` 尾部的后置覆盖块执行顺序不可重排，只改字符串字面量。
- `pillar: [1, 48, 1]` **格数不变**（48 × 50 = 2400 mm 高，墙内放得下）。

### 3. `src/core/scenes.js`

- `PILLAR_COLUMNS = [3, 18, 33, 48]` **格位不变**（柱距 15 格 = 750 mm；右缘 49 ≤ 58 ✓）。
- 各预设 `item()` 格位：保持现有格坐标不变，逐场景跑 `valid()` 核对（gy 上限从 60 降到 58，现有最高位 44+4=48，全部安全）。仅当某模块因 panel 缩格导致挂接/冲突测试失败时才微调，并在提交信息中说明。

### 4. `src/core/mount/rungs.js`

- **不改算法**。50 ≡ 0 (mod 25)，minimax 会对所有物品收敛到同一个常量微调值，残差归零。验证方法：跑测试看 `mountRungResidualsMm` 输出是否全为 0（或 ≤0.05 的浮点尾差）。
- 注释中关于互质/minimax 的说明可补一句「50 mm 网格下退化为常量」。

### 5. `src/store/exportData.js`

- `version: 'grid48-1'` → `'grid50-1'`；`unit_mm: 48` → `50`。
- 所有 `* 48` 乘数 → `* 50`（共 5 处：`position_grid_mm`、`dimensions_mm`、`anchor_world_mm` 三处）。墙面偏移 `+ 10`（ORIGIN 毫米值）不变。
- warning 文案 `48mm背部适配系统` → `50mm背部适配系统`。

### 6. `src/renderer/environment.js` ⚠️ 有硬编码

网格辅助线写死了 48mm 派生值，必须改：

- 第 14 行 `2.89`（网格线高度）→ `2.9`；`-1.44`/`1.44`（x 向范围）→ `-1.45`/`1.45`（多处）
- 第 22 行 `24 * PITCH`（z 向）不变
- 墙面本体 `cube(2.9, 2.9, 0.1, …)` 不变（真实墙就是 2900 mm）

### 7. `src/App.jsx` 文案

- 导出文件名 `邮轮72变_48mm网格配置.json` → `邮轮72变_50mm网格配置.json`
- 页头 `48 MM NODE SYSTEM` → `50 MM NODE SYSTEM`
- 脚注 `48 mm / 格 · 60 × 60 × 24` → `50 mm / 格 · 58 × 58 × 24`

### 8. 测试重定基线（`tests/`）

- `grid.mjs`（1003 项断言）：所有按 48mm 推导的期望值改按 50mm 重算；吸附断言从 `worst ≤ 5.5` 收紧为 `worst ≤ 0.1`（或恒等 0）。
- `store.mjs`：导出 JSON 里的毫米值、版本号断言。
- `scene.mjs`：吸附/微调断言、模块位置断言按新网格更新。
- `scene-lifecycle.mjs`：`ORIGIN`/`PITCH` 数值断言。
- **不许动**：`assembly.json` 字节一致性哈希校验（`assets/rhino` 管线完全不受影响）。

### 9. 文档同步

- `README.md`：48 mm 表述、`60 × 60 × 24` 网格、目录树描述
- `src/core/README.md`：同上
- `AGENTS.md`：「authoritative 48 mm grid model」→ 50 mm
- `VERSION_HISTORY.md`：**新增 V5.0 条目**——命名规则写明「V4.x 为 48 mm 系列」，50 mm 是新系列起点，更新命名规则行

## 禁止触碰

- `dist/`（已 gitignore，勿提交）
- `assets/rhino/` 全管线（源 3dm、manifest、assembly.json 哈希测试）
- `src/geometry/models/rhino.js` 的毫米常量（真实梯柱网格，任务前提就是梯柱不变）
- `src/core/mount/clamp.js` 的节点机构参数（导柱直径、行程、夹口等，项目方后续改版节点）
- 各文件的导出名与函数签名（`core/index.js` 的 39 名导出面保持不变）

## 验收标准

1. `npm ci && npm test && npm run build` 全绿
2. 全库 grep 无遗留 `48` 相关字面量（历史文档 VERSION_HISTORY 旧条目除外）
3. 导出 JSON `version` 为 `grid50-1`、`unit_mm` 为 50
4. 吸附残差在全部预设/展陈上恒为 0
5. 文档四处同步 + VERSION_HISTORY 新增 V5.0 条目

## 执行约束

- 遵守 `AGENTS.md`：单语句单行、Prettier 风格（单引号、2 空格缩进）、长表达式换行
- 建议分步提交：constants → modules/scenes → export/UI 文案 → 测试基线 → 文档
- 每步提交前跑 `npm test` 确保绿
