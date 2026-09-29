import { useEffect, useRef, useSyncExternalStore } from 'react';
import { MODULES as M, clone } from './model/index.js';
import { Catalog } from './components/Catalog.jsx';
import { Inspector } from './components/Inspector.jsx';
import { Stage } from './components/Stage.jsx';
import { SceneGallery } from './components/SceneGallery.jsx';
import { AboutDialog } from './components/AboutDialog.jsx';
export function download(url, name) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
}
export default function App({ store }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot),
    dialog = useRef(null);
  const exportConfig = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(store.exportData(), null, 2)], { type: 'application/json' }),
    );
    download(url, '邮轮72变_48mm网格配置.json');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    store.toast('格坐标、占位和功能清单已导出');
  };
  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) || dialog.current?.open)
        return;
      const rect = document.getElementById('planner')?.getBoundingClientRect();
      if (rect?.height && (rect.top >= window.innerHeight || rect.bottom <= 0)) return;
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
      if ((e.key === 'Delete' || e.key === 'Backspace') && s.rightTab === 'detail') {
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
    <>
      <header>
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
          <a className="gallery-nav" href="#scene-gallery">
            场景图册
          </a>
          <span className="pill">V4.8 · 挂接修复版</span>
          <a href="https://cruise72-react.2161598874.workers.dev/" target="_blank" rel="noopener">
            项目网站 ↗
          </a>
          <button id="about" onClick={() => dialog.current.showModal()}>
            设计逻辑
          </button>
          <a className="primary configure-link" href="#planner-section">
            自定义配置 ↗
          </a>
        </div>
      </header>
      <SceneGallery store={store} />
      <section id="planner-section" className="planner-section" aria-labelledby="planner-heading">
        <div className="planner-heading">
          <div>
            <div className="eyebrow">72+ / CONFIGURATOR</div>
            <h2 id="planner-heading">自定义专属墙面</h2>
            <p>以 48 mm 为一步，调整节点、模块与组合。</p>
          </div>
          <button className="primary export" id="export" onClick={exportConfig}>
            导出方案 ↓
          </button>
        </div>
        <main id="planner" className="workspace">
          <Catalog state={state} store={store} />
          <Stage state={state} store={store} onDownload={download} />
          <Inspector state={state} store={store} onExport={exportConfig} />
        </main>
      </section>
      <AboutDialog dialogRef={dialog} />
    </>
  );
}
