# 72+ 邮轮模块配置器 · React

现有测试页已迁移为 **React 19 + Vite + Three.js 0.170.0**。保留原页面 DOM 结构、文字、CSS、模型几何、材质、相机与动画参数，以及48 mm网格、四种场景、模块操作和JSON/PNG导出。

## 当前部署

- 在线地址：[72+ 邮轮模块配置器](https://cruise72-module-planner.aaaaajie19.chatgpt.site)。React 版本已于 2026-09-22 成功发布，网站现为公开访问。
- 托管平台：Sites，继续沿用原项目 ID `appgprj_6aaa5e1a9544819193287ca435127a86` 和原链接，配置见 `.openai/hosting.json`。
- 源码仓库：[texchen11111/cruise72-react](https://github.com/texchen11111/cruise72-react)，当前为公开仓库，主分支为 `main`。网站公开权限与源码仓库权限独立。
- 部署内容：Vite 构建生成的 `dist/` 静态文件。Sites 地址仍需通过 Sites 单独发布。另有 Cloudflare Worker `cruise72-react` 已连接本仓库，GitHub 提交会触发 Workers Builds；其结果见提交检查 `Workers Builds: cruise72-react`。两条发布流程互相独立。
- [原项目介绍网站](https://72cruise.haoooo.workers.dev/)保持独立，本次 React 配置器发布未修改该网站。

Sites 与仓库权限状态于 2026-09-24 核对；Cloudflare Git 集成于 2026-09-27 核对。配置器不含服务端或数据库；方案仅保存在当前页面内存中，刷新会恢复初始预设，请通过 JSON 导出保存。

## Cloudflare Workers 部署

现有 Worker 名称为 `cruise72-react`，根目录 `wrangler.jsonc` 显式指定该名称及 `assets.directory: "./dist"`。保留 Vite 的构建配置，不依赖 Wrangler 自动识别和改写项目。

- 构建命令：`npm run build`。
- 部署命令：`npx wrangler deploy`。
- 本地部署预检：先运行 `npm run build`，再运行 `npx wrangler@4.137.0 deploy --dry-run`。预检不会上传或发布。
- 构建成功不等于部署成功；需确认对应提交的 Cloudflare 检查完成且成功。
- `wrangler.jsonc` 不保存令牌；云端凭据由 Cloudflare 的 Git 集成管理。

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
- `src/scene/`：保留原有 Three.js 几何与渲染。`createPlannerScene.js` 为组装入口，按职责拆为 materials（共享材质）/ environment（相机灯光墙面）/ moduleGeometry（模块与梯柱建模）/ pointer（画布交互），React 挂载时初始化、卸载时清理动画帧、监听器、观察器、控制器和图形资源。
- `src/model/`：原样保留的模块元数据与48 mm网格规则。
- `src/styles/style.css`：原样保留的样式。
- `vendor/`：保留的 Three.js 与 OrbitControls（项目根目录；开发时经 Vite alias 引入，构建时复制到 `dist/vendor/` 并由 `index.html` 的 importmap 在运行时加载）。

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
