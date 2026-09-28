import { useEffect, useRef } from 'react';
import { PRESETS, EXHIBITIONS, MODULES } from '../model/index.js';
import { ModelPreview } from './ModelPreview.jsx';
import { createPlannerScene } from '../scene/createPlannerScene.js';
import { createFallbackPlanner } from '../scene/fallbackPlanner.js';
export function Stage({ state, store, onDownload }) {
  const container = useRef(null),
    engine = useRef(null);
  useEffect(() => {
    try {
      engine.current = createPlannerScene(container.current, store);
    } catch (e) {
      engine.current = createFallbackPlanner(container.current, store);
      store.setError(
        '当前浏览器无法启动 WebGL，已切换为平面预览；模块库、设置、清单和尺寸调整仍可使用。',
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
              {PRESETS[state.preset].name +
                (state.preset === 0 ? ' · ' + EXHIBITIONS[state.exhibition].name : '') +
                (state.dirty ? ' · 自定义' : '')}
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
          <h2>同一面墙，多种场景</h2>
          <button className="play" id="play" onClick={store.togglePlay}>
            {state.playing ? 'Ⅱ 暂停演示' : '▶ 演示场景切换'}
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
              <b>{p.name}</b>
              <small>{p.tag}</small>
            </button>
          ))}
        </div>
        {state.preset === 0 && (
          <div className="exhibition-tabs" role="group" aria-label="展陈方式">
            {EXHIBITIONS.map((ex, i) => (
              <button
                key={ex.id}
                data-exhibition={i}
                aria-pressed={state.exhibition === i}
                className={state.exhibition === i ? 'active' : ''}
                onClick={() => {
                  store.stopPlay();
                  store.setExhibition(i);
                }}
              >
                <ModelPreview items={ex.items} cacheKey={ex.id} />
                <span className="exhibition-label">
                  <b>{ex.name}</b>
                  <small>{ex.tag}</small>
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="scenedesc" id="sceneDesc">
          {state.preset === 0 ? EXHIBITIONS[state.exhibition].desc : PRESETS[state.preset].desc}
        </div>
        <div className="node-summary">
          <b>48 mm 节点 × {state.items.reduce((n, a) => n + MODULES[a.type].mount, 0)}</b>
          <span>梯柱 → 节点 → 拓展</span>
        </div>
        {state.transition && (
          <div className="transition-note" role="status">
            保留 {state.transition.retained} 组（含 {state.transition.nodes} 个节点） · 移位{' '}
            {state.transition.moved} 组 · 新增 {state.transition.added} 组 · 收起{' '}
            {state.transition.removed} 组
            <small>沿用同一组构件身份；动画为组合示意，非真实安装路径。</small>
          </div>
        )}
      </div>
    </section>
  );
}
