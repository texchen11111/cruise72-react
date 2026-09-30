# src/core — 48 mm 领域规则

布局规则的权威实现，源码分层中的最底层：纯数据 + 纯函数，**不 import three**，纯 Node 可测。所有组件、renderer、geometry 和测试都统一从 `index.js` 导入，`index.js` 只是兼容性 re-export，不含逻辑。向上只被 `geometry/`（派生网格）和 `store/`（状态操作）引用，core 不反向依赖它们。

## 文件职责与依赖方向

依赖单向无环，自底向上；`mount/` 子目录收拢**具体交互点**这一层（挂接关系 → 横档吸附 → 夹持机械），全部经 `index.js` 对外导出：

```
constants → modules → presets → grid ┐
                                     ├→ mount/mounting → mount/rungs → mount/clamp
assembly（仅依赖 modules）；geometry/models/rhino.js 是唯一经内部路径引用 clamp 的例外
```

| 文件 | 职责 | 说明 |
| --- | --- | --- |
| `constants.js` | `PITCH`、`GRID`、`ORIGIN` | 网格常量，唯一定义处 |
| `modules.js` | `MODULES` 模块资料库 | 定义 + 尺寸/family/subkind/interfaces 派生 |
| `presets.js` | 预设数据 | `item()`、`PILLAR_COLUMNS`、`EXHIBITIONS`、`PRESETS` |
| `grid.js` | 网格几何规则 | `cells`、`envelope`、`valid`、`clampPosition`、`position`、`conflict`、`findSpace`、`clone` |
| `assembly.js` | 装配与对比 | `assembly(type)`、`compareLayouts`，类型级物料清单，服务导出/文档 |
| `mount/clamp.js` | 夹持机械层参数 | 毫米参数与公式，不感知任何物品或格位 |
| `mount/mounting.js` | 挂接/父子规则 | `parentFamily`、`normalizeParents`、`childrenOf`、`mountPoints`、`mounted`、`snapToPillar`、`snapExtension`、`attachExtensions`、`prepareLayout` |
| `mount/rungs.js` | 横档吸附（机械层） | `rungSnapShiftMm`、`mountRungResidualsMm`、`mountingKey`，grid 挂点 ↔ clamp 毫米格架的桥 |
| `index.js` | 兼容性出口 | 只 re-export，导出面与拆分前完全一致（39 个名字） |

## 规则与注意事项

- **只从 `index.js` 导入**。不要跨文件直接引 `modules.js` / `grid.js` 等内部模块，导出面以 `index.js` 为准。
- **`MODULES` 有模块作用域后置覆盖**（`block.name`/`block.intro` 二次赋值、`panel.note`/`worktop.note` 覆盖、`cabinet.note` 追加），集中在 `modules.js` 尾部且执行顺序不可重排；新增模块属性派生请追加在对应循环之后。
- **内部共享 helper 不从 `index.js` 导出**：`pillarsFor`、`nodeAtPoint`、`blockSupports` 由 `mount/mounting.js` 导出（`mount/rungs.js` 复用），`item` 由 `presets.js` 导出（`grid.js` 的 `findSpace` 复用）——仅限目录内部使用。
- **48 mm 网格与毫米机械参数分开管理**：格位规则只认 `PITCH`/`GRID`，机械尺寸只认 `mount/clamp.js`，两者禁止互相换算替代。
- **改行为必须同步测试**：`tests/grid.mjs`（1003 项断言）直接覆盖本目录全部公开函数；派生挂接点不进入 `state.items`，配置清单不因此膨胀。
