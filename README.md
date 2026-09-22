# 72+ 邮轮模块配置器 · React

现有测试页已迁移为 **React 19 + Vite + Three.js 0.170.0**。保留原页面 DOM 结构、文字、CSS、模型几何、材质、相机与动画参数，以及48 mm网格、四种场景、模块操作和JSON/PNG导出。

## 开发

需要 Node.js 20.19+ 或22.12+。

```sh
npm ci
npm run dev
npm test
npm run build
```

`dist/` 为构建生成的静态页面。运行 `npm run preview` 可检查构建结果。构建包中的 React 与 Three.js 均本地提供，无运行时 CDN 依赖。

## 后续修改约定

后续界面与交互全部使用 React。不要直接编辑 `dist/`，也不要恢复原生 `innerHTML` 页面拼接。要求同时写入 `AGENTS.md`。

- `src/main.jsx`：React 根节点与热更新清理。
- `src/App.jsx`：页面组合、快捷键、配置导出。
- `src/components/`：模块库、设置/清单、三维工作区与设计说明。
- `src/store.js`：统一不可变状态，通过 React `useSyncExternalStore` 订阅。包含添加/移动/复制/删除、场景、功能状态与自动演示。
- `src/scene/createPlannerScene.js`：保留原有 Three.js 几何与渲染，React 挂载时初始化、卸载时清理动画帧、监听器、观察器、控制器和图形资源。
- `src/model.js`：原样保留的模块元数据与48 mm网格规则。
- `src/style.css`：原样保留的样式。
- `public/vendor/`：保留的 Three.js 与 OrbitControls。

## 交互与尺度

每格48 × 48 × 48 mm；2900 mm墙面内60 × 60格，四边各留10 mm；深度24格。拖动在XY平面吸附，右侧坐标和方向键 / PageUp / PageDown 调整XYZ。
9类模块，允许占位邻接，禁止三维包络重叠。展柜开门增加14格前方活动包络，折叠台始终保留14 × 10 × 10格包络。JSON数据格式仍为 `grid48-1`；修改仍需导出保存，不新增持久化逻辑。

网格不是原梯柱孔距。背部适配层、悬挑连接及承载仍需验证；页面是空间交互原型，不是生产CAD。

## 迁移验证

- 241项原网格断言通过。
- 状态操作、场景、移动拒绝、导出结构和自动演示检查通过。
- 迁移前后初始DOM结构、属性与文字逐项一致，CSS和网格模型源文件逐字一致。
- React DOM交互与组件生命周期测试通过：更新控件不会重建三维画布，卸载会调用清理。
- 生产构建通过。DOM测试使用模拟渲染器，未执行真实浏览器WebGL视觉回归。

保留原 Site 标识，不修改 https://72cruise.haoooo.workers.dev/ 网站。在线更新需要 Sites 服务可用；本次服务返回 `Invalid MCP request metadata`，因此尚未将此次迁移发布到线上。
