import { useEffect, useRef } from 'react';
import { PRESETS } from '../model/index.js';
import { createPlannerScene } from '../scene/createPlannerScene.js';
export function Stage({ state, store, onDownload }) {
  const container = useRef(null),
    engine = useRef(null);
  useEffect(() => {
    try {
      engine.current = createPlannerScene(container.current, store);
    } catch (e) {
      store.setError(
        '三维画面暂时无法启动。请使用支持 WebGL 的新版浏览器并开启图形加速。仍可通过模块库、设置和清单查看方案。',
      );
      console.error(e);
    }
    return () => {
      engine.current?.destroy();
      engine.current = null;
    };
  }, [store]);
  const snapshot = () => {
    if (!engine.current) {
      store.toast('当前无法生成三维截图');
      return;
    }
    onDownload(engine.current.snapshot(), '邮轮72变_当前配置.png');
    store.toast('当前三维画面已保存');
  };
  return (
    <section className="center" aria-label="模块配置工作区">
      <div className="stage" id="stage" ref={container}>
        <div className="stagebar">
          <div className="stagecaption">
            <strong id="sceneTitle">
              {PRESETS[state.preset].name + (state.dirty ? ' · 自定义' : '')}
            </strong>
            <span>墙面 2900 × 2900 mm</span>
            <br />
            <span id="dimText">
              48 mm / 格 · 60 × 60 × 24 格{state.gridTouched ? '' : ' · 适配层示意'}
            </span>
          </div>
          <div className="viewtabs" role="group" aria-label="观察角度">
            <button
              data-view="3d"
              className={state.view === '3d' ? 'active' : ''}
              onClick={() => store.setView('3d')}
            >
              透视
            </button>
            <button
              data-view="front"
              className={state.view === 'front' ? 'active' : ''}
              onClick={() => store.setView('front')}
            >
              正视
            </button>
          </div>
        </div>
        <div className="tools">
          <button id="dims" aria-pressed={state.showDims} onClick={store.toggleGrid}>
            网格
          </button>
          <button id="resetView" title="还原观察角度" onClick={() => engine.current?.resetView()}>
            复位视角
          </button>
          <button id="snapshot" title="保存当前画面" onClick={snapshot}>
            存图 ↓
          </button>
        </div>
        <div className="hint">
          拖动吸附 48 mm · 方向键移动
          <br />
          PageUp / PageDown 向外 / 向内 · 空白处旋转
        </div>
        <div className={'toast' + (state.toast ? ' show' : '')} role="status" aria-live="polite">
          {state.toast}
        </div>
        <div id="loaderror" className="loaderror" hidden={!state.error}>
          {state.error}
        </div>
      </div>
      <div className="scenes">
        <div className="sceneshead">
          <h2>同一面墙，一天的不同活动</h2>
          <button className="play" id="play" onClick={store.togglePlay}>
            {state.playing ? 'Ⅱ 暂停演示' : '▶ 自动演示'}
          </button>
        </div>
        <div className="scenegrid">
          {PRESETS.map((p, i) => (
            <button
              key={p.id}
              className={'scene ' + (i === state.preset ? 'active' : '')}
              data-scene={i}
              onClick={() => {
                store.stopPlay();
                store.setPreset(i);
              }}
            >
              <span className="time">{p.time}</span>
              <b>{p.name}</b>
              <small>{p.tag}</small>
            </button>
          ))}
        </div>
        <div className="scenedesc" id="sceneDesc">
          {PRESETS[state.preset].desc}
        </div>
      </div>
    </section>
  );
}
