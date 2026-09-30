import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { MODULES as M, clone } from './model/index.js';
import { Catalog } from './components/Catalog.jsx';
import { Inspector } from './components/Inspector.jsx';
import { Stage } from './components/Stage.jsx';
import { ScenePicker } from './components/ScenePicker.jsx';
import { HoverPanel } from './components/HoverPanel.jsx';
import { RenderOverlay } from './components/RenderOverlay.jsx';
import './styles/workspace.css';
export function download(url, name) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
}
export default function App({ store }) {
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  const [activePanel, setActivePanel] = useState(null);
  const [showRenders, setShowRenders] = useState(false);
  const closeRenders = useCallback(() => setShowRenders(false), []);
  const exportConfig = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(store.exportData(), null, 2)], {
        type: 'application/json',
      }),
    );
    download(url, '邮轮72变_48mm网格配置.json');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    store.toast('格坐标、占位和功能清单已导出');
  };
  useEffect(() => {
    const onKey = (e) => {
      if (
        e.defaultPrevented ||
        e.target.closest?.(
          'input, select, textarea, button, summary, [role="dialog"]',
        )
      )
        return;
      const rect = document.getElementById('planner')?.getBoundingClientRect();
      if (rect?.height && (rect.top >= window.innerHeight || rect.bottom <= 0))
        return;
      const s = store.getSnapshot(),
        a = s.items.find((x) => x.id === s.selected);
      if (!a) return;
      const keys = {
        ArrowLeft: ['gx', -1],
        ArrowRight: ['gx', 1],
        ArrowDown: ['gy', -1],
        ArrowUp: ['gy', 1],
        PageDown: ['gz', -1],
        PageUp: ['gz', 1],
      };
      if (keys[e.key]) {
        e.preventDefault();
        const [k, d] = keys[e.key];
        store.moveItem(a.id, { [k]: a[k] + d });
      }
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        s.rightTab === 'detail'
      ) {
        e.preventDefault();
        store.remove(a.id);
      }
    };
    window.addEventListener('keydown', onKey);
    window.__planner = {
      getItems: () => clone(store.getSnapshot().items),
      setPreset: store.setPreset,
      addItem: store.addItem,
      moveItem: store.moveItem,
      patchItem: store.patchItem,
      modules: M,
    };
    return () => {
      window.removeEventListener('keydown', onKey);
      delete window.__planner;
    };
  }, [store]);
  return (
    <div className="canvas-app">
      <header className="workspace-header">
        <a
          className="brand"
          href="https://72cruise.haoooo.workers.dev/"
          target="_blank"
          rel="noopener"
          aria-label="72+ 项目网站"
        >
          72+
        </a>
        <div className="headtitle">
          邮轮72变<small>48 MM NODE SYSTEM</small>
        </div>
        <div className="headlinks">
          <button
            className="render-toggle"
            aria-haspopup="dialog"
            aria-expanded={showRenders}
            onClick={() => {
              setActivePanel(null);
              setShowRenders(true);
            }}
          >
            场景效果图 ↗
          </button>
          <button className="primary export" id="export" onClick={exportConfig}>
            导出方案 ↓
          </button>
        </div>
      </header>
      <section id="planner-section" className="planner-section">
        <main id="planner" className="workspace">
          <Stage state={state} store={store} onDownload={download} />
          <div className="workspace-rail rail-left" aria-label="搭建工具">
            <HoverPanel
              id="catalog"
              label="模块"
              title="模块自定义"
              icon="modules"
              activePanel={activePanel}
              onActivePanel={setActivePanel}
            >
              <Catalog state={state} store={store} />
            </HoverPanel>
            <HoverPanel
              id="scenarios"
              label="场景"
              title="预设场景"
              icon="scenes"
              activePanel={activePanel}
              onActivePanel={setActivePanel}
            >
              <ScenePicker state={state} store={store} />
            </HoverPanel>
            <HoverPanel
              id="guide"
              label="说明"
              title="从一件模块开始"
              icon="guide"
              activePanel={activePanel}
              onActivePanel={setActivePanel}
            >
              <div className="workspace-guide">
                <p>先布置梯柱，再连接节点，最后挂接拓展模块。</p>
                <dl>
                  <dt>添加与选择</dt>
                  <dd>
                    从模块库拖入或点击添加；点击画面中的模块后，从右侧「设置」调整。
                  </dd>
                  <dt>移动与尺寸</dt>
                  <dd>拖动模块改变位置，拖动蓝色控制点调整尺寸。</dd>
                  <dt>观察</dt>
                  <dd>拖动空白处旋转，滚轮缩放；使用正视图检查排布。</dd>
                  <dt>键盘</dt>
                  <dd>
                    方向键移动，PageUp / PageDown 调整离墙距离。Esc 收起面板。
                  </dd>
                </dl>
                <p className="workspace-footnote">
                  48 mm / 格 · 60 × 60 × 24
                  格。场景效果图展示氛围，具体尺寸以配置为准。
                </p>
              </div>
            </HoverPanel>
          </div>
          <div className="workspace-rail rail-right" aria-label="方案信息">
            <HoverPanel
              id="inspector"
              label="设置"
              title="设置与清单"
              icon="settings"
              side="right"
              activePanel={activePanel}
              onActivePanel={setActivePanel}
            >
              <Inspector state={state} store={store} onExport={exportConfig} />
            </HoverPanel>
          </div>
          <div className="workspace-status" aria-hidden="true">
            <span className="status-dot" /> 梯柱 / 节点 / 拓展
          </div>
          {showRenders && <RenderOverlay onClose={closeRenders} />}
        </main>
      </section>
    </div>
  );
}
