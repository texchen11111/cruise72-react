import { PRESETS, EXHIBITIONS, MODULES } from '../core/index.js';

export function ScenePicker({ state, store }) {
  return (
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
              <span className="exhibition-label">
                <b>{ex.name}</b>
                <small>{ex.tag}</small>
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="scenedesc" id="sceneDesc">
        {state.preset === 0
          ? EXHIBITIONS[state.exhibition].desc
          : PRESETS[state.preset].desc}
      </div>
      <div className="node-summary">
        <b>
          48 mm 节点 ×{' '}
          {state.items.reduce((n, a) => n + MODULES[a.type].mount, 0)}
        </b>
        <span>梯柱 → 节点 → 拓展</span>
      </div>
      {state.transition && (
        <div className="transition-note" role="status">
          保留 {state.transition.retained} 组（含 {state.transition.nodes}{' '}
          个节点） · 移位 {state.transition.moved} 组 · 新增{' '}
          {state.transition.added} 组 · 收起 {state.transition.removed} 组
          <small>沿用同一组构件身份；动画为组合示意，非真实安装路径。</small>
        </div>
      )}
    </div>
  );
}
