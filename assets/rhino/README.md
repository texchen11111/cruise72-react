# Rhino 模型资产（源文件 + 生成产物）

本目录是 **CAD 资产管线** 的落点，与运行时代码目录 `src/geometry/models/` 分工不同：

| 位置 | 角色 |
| --- | --- |
| `assets/rhino/source/ladder-node.3dm` | 原始 Rhino 文件（原件 `梯柱 节点.3dm` 的副本），唯一手改入口 |
| `assets/rhino/manifest.json` | 溯源元数据：源文件 SHA-256、接口尺寸、提取方法 |
| `assets/rhino/generated/assembly.json` | 生成产物归档（禁止手改） |
| `src/geometry/models/rhino/assembly.json` | 打包输入，`scripts/export-rhino.py` 双写的一份 |

管线（单一来源，可复现）：

```
source/ladder-node.3dm ──scripts/export-rhino.py──▶ generated/assembly.json
                                              └────▶ src/geometry/models/rhino/assembly.json（Vite 打包）
```

`npm test` 会校验两份 `assembly.json` 字节一致、且源 3dm 哈希与 `manifest.json` 记录一致——
人工改任一份即测试失败。更新模型只改 `.3dm` 后重跑导出脚本，不要直接编辑 JSON。
