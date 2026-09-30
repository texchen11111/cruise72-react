import { useEffect, useRef } from 'react';
import { PRESETS, EXHIBITIONS } from '../core/index.js';
import { createPlannerScene } from '../renderer/createPlannerScene.js';
import { createFallbackPlanner } from '../renderer/fallbackPlanner.js';
export function Stage({ state, store, onDownload }) {
  const container = useRef(null),
    engine = useRef(null);
  useEffect(() => {
    try {
      engine.current = createPlannerScene(container.current, store);
      window.__plannerCamera = engine.current.debugCamera;
    } catch (e) {
      engine.current = createFallbackPlanner(container.current, store);
      store.setError(
        '三维场景初始化失败，已切换为平面预览；模块库、设置、清单和尺寸调整仍可使用。',
      );
      console.error(e);
    }
    return () => {
      delete window.__plannerCamera;
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
                (state.preset === 0
                  ? ' · ' + EXHIBITIONS[state.exhibition].name
                  : '') +
                (state.dirty ? ' · 自定义' : '')}
            </strong>
            <span>模块配置 / {state.items.length} 件构件</span>
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
          <button
            id="dims"
            aria-pressed={state.showDims}
            onClick={store.toggleGrid}
          >
            网格
          </button>
          <button
            id="resetView"
            title="还原观察角度"
            onClick={() => engine.current?.resetView()}
          >
            复位视角
          </button>
          <button id="snapshot" title="保存当前画面" onClick={snapshot}>
            存图 ↓
          </button>
        </div>
        <div
          className={'toast' + (state.toast ? ' show' : '')}
          role="status"
          aria-live="polite"
        >
          {state.toast}
        </div>
        <div id="loaderror" className="loaderror" hidden={!state.error}>
          {state.error}
        </div>
      </div>
    </section>
  );
}
