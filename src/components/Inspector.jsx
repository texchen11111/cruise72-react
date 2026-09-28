import { Fragment, useEffect, useState } from 'react';
import { MODULES as M, GRID, cells, assembly } from '../model/index.js';
import { Icon } from './Icon.jsx';

// Commit on blur/Enter, matching the original native change event. Local draft
// lets users type multi-digit coordinates without moving the module per digit.
function Coordinate({ a, axis, index, store }) {
  const [draft, setDraft] = useState(String(a[axis]));
  useEffect(() => setDraft(String(a[axis])), [a.id, a[axis]]);
  const commit = () => {
    const value = Number(draft);
    if (value !== a[axis]) store.moveItem(a.id, { [axis]: value });
    setDraft(String(store.getSnapshot().items.find((x) => x.id === a.id)?.[axis] ?? a[axis]));
  };
  return (
    <Fragment>
      <div className="row">
        <label htmlFor={axis}>{['X 左右', 'Y 上下', 'Z 离墙'][index]} / 格</label>
        <input
          id={axis}
          type="number"
          min="0"
          max={GRID[index] - cells(a)[index]}
          step="1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
          }}
        />
      </div>
      <div className="rangeends">
        <span>{a[axis] * 48} mm（相对网格原点）</span>
      </div>
    </Fragment>
  );
}
function Dimension({ a, axis, index, store }) {
  const base = cells(a);
  const [draft, setDraft] = useState(String(base[index]));
  useEffect(() => setDraft(String(cells(a)[index])), [a.id, a.sizeCells, a.state]);
  const commit = () => {
    const value = Math.max(1, Math.round(Number(draft)));
    const next = cells(a);
    next[index] = value;
    store.resizeItem(a.id, next);
    setDraft(String(store.getSnapshot().items.find((x) => x.id === a.id) ? cells(store.getSnapshot().items.find((x) => x.id === a.id))[index] : base[index]));
  };
  return (
    <div className="row">
      <label htmlFor={'size-' + axis}>{['宽度', '高度', '深度'][index]} / 格</label>
      <input id={'size-' + axis} type="number" min="1" max={GRID[index]} step="1" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && commit()} />
      <span className="unitread">{base[index] * 48} mm</span>
    </div>
  );
}
function ModuleDetails({ a, store }) {
  const m = M[a.type],
    parts = assembly(a.type);
  return (
    <>
      <div className="modtitle">
        <Icon type={a.type} />
        <div>
          <h2>{m.name}</h2>
          <small>
            {m.en} / {m.code}
          </small>
        </div>
      </div>
      <span className="tag">{m.level}</span>
      <div className="familyline"><b>{m.family}</b><span>{m.subkind}</span></div>
      <div className="interfacechips">{m.interfaces?.map((x) => <span key={x}>{x}</span>)}</div>
      <details className="assembly-details">
        <summary>节点与连接构成</summary>
        <div className="assembly-spec">
          <b>01 · 48 mm 节点 × {parts.nodes}</b>
          <span>02 · {parts.connector}</span>
          <span>03 · {parts.surface}</span>
          <small>节点包含在组合占位中；移动时整组按48 mm吸附。</small>
        </div>
      </details>
      <p className="intro">{m.intro}</p>
      <div className="spec">
        <b>
          {cells(a).map((v) => v * 48).join(' × ')} mm
        </b>
        {m.anchor}
      </div>
      <div className="gridread">{m.cells.join(' × ')} 格 · 占位包络</div>
      <p className="conceptnote">
        坐标原点：网格左下后角。XYZ 分别为左右、上下、离墙；一格 = 48 mm。
      </p>
      {['gx', 'gy', 'gz'].map((axis, index) => (
        <Coordinate key={axis} a={a} axis={axis} index={index} store={store} />
      ))}
      <div className="dimensiontitle">尺寸可调 · 拖动画布上的蓝色控制点</div>
      {['x', 'y', 'z'].map((axis, index) => <Dimension key={axis} a={a} axis={axis} index={index} store={store} />)}
      <p className="warning">
        {a.gz ? '离墙叠放：需要独立连接件及承力结构。' : '贴墙层：需以适配背板连接真实梯柱。'}
      </p>
      <div className="row">
        <span>节点颜色</span>
        <div className="swatches">
          {['#3158e8', '#ed8e40', '#e8e9e6', '#343b48'].map((co) => (
            <button
              key={co}
              className={'swatch ' + (a.color === co ? 'chosen' : '')}
              style={{ background: co }}
              data-color={co}
              aria-label={
                { '#3158e8': '蓝色', '#ed8e40': '橙色', '#e8e9e6': '白色', '#343b48': '深灰' }[co] +
                '节点'
              }
              onClick={() => store.patchItem(a.id, { color: co })}
            />
          ))}
        </div>
      </div>
      {['cabinet', 'worktop', 'lamp', 'scent', 'bookrest'].includes(a.type) && (
        <>
          <hr className="divider" />
          <div className="row">
            <span>
              {
                { bookrest: '图录', cabinet: '柜门', worktop: '台面', lamp: '灯具', scent: '香氛' }[
                  a.type
                ]
              }
            </span>
            <button
              id="toggleState"
              className={'switchbtn ' + (a.state ? 'on' : '')}
              aria-pressed={!!a.state}
              onClick={() => store.toggleState(a.id)}
            >
              {a.state
                ? {
                    bookrest: '已取阅',
                    cabinet: '已打开',
                    worktop: '已展开',
                    lamp: '已开启',
                    scent: '已开启',
                  }[a.type]
                : {
                    bookrest: '已归位',
                    cabinet: '已关闭',
                    worktop: '已收拢',
                    lamp: '已关闭',
                    scent: '已关闭',
                  }[a.type]}
            </button>
          </div>
        </>
      )}
      {a.type === 'lamp' && (
        <>
          <div className="row">
            <label htmlFor="intensity">亮度</label>
            <span id="intensityValue">{a.intensity}%</span>
          </div>
          <input
            id="intensity"
            type="range"
            min="5"
            max="100"
            value={a.intensity}
            aria-label="灯具亮度"
            onChange={(e) => store.patchItem(a.id, { intensity: +e.target.value })}
          />
          <div className="row">
            <label htmlFor="temperature">色温</label>
            <select
              id="temperature"
              value={a.temperature}
              onChange={(e) => store.patchItem(a.id, { temperature: +e.target.value })}
            >
              {[2700, 3200, 4000].map((v) => (
                <option key={v} value={v}>
                  {v} K
                </option>
              ))}
            </select>
          </div>
        </>
      )}
      {a.type === 'scent' && (
        <p className="warning">香氛默认关闭，可选择无香使用。动画仅展示开启状态。</p>
      )}
      <hr className="divider" />
      <div className="actrow">
        <button id="duplicate" onClick={() => store.duplicate(a.id)}>
          复制模块
        </button>
        <button id="remove" className="danger" onClick={() => store.remove(a.id)}>
          移除
        </button>
      </div>
      <details>
        <summary>如何实现</summary>
        <p>{m.mechanism}</p>
      </details>
      <details>
        <summary>标准件与功能机芯</summary>
        <p>{m.parts}</p>
      </details>
      <p className="conceptnote">{m.note}</p>
    </>
  );
}
export function Inspector({ state, store, onExport }) {
  const { items, selected, rightTab } = state,
    a = items.find((x) => x.id === selected);
  return (
    <aside className="inspector">
      <div className="righttabs" role="group" aria-label="模块信息">
        <button
          className={rightTab === 'detail' ? 'active' : ''}
          data-tab="detail"
          onClick={() => store.setTab('detail')}
        >
          模块设置
        </button>
        <button
          className={rightTab === 'list' ? 'active' : ''}
          data-tab="list"
          onClick={() => store.setTab('list')}
        >
          配置清单 <span id="count">{items.length}</span>
        </button>
      </div>
      <div className="detail" id="detail">
        {rightTab === 'list' ? (
          <>
            <h2>当前墙面</h2>
            <div className="listcount">
              {items.length} <small>件功能模块</small>
            </div>
            {items.length ? (
              items.map((a) => (
                <button
                  key={a.id}
                  className="listitem"
                  data-select={a.id}
                  onClick={() => store.select(a.id)}
                >
                  <Icon type={a.type} />
                  <span>
                    <b>{M[a.type].name}</b>
                    <small>
                      格坐标 {a.gx}, {a.gy}, {a.gz}
                    </small>
                  </span>
                  <span style={{ flex: 0, color: 'var(--muted)' }}>↗</span>
                </button>
              ))
            ) : (
              <div className="empty">从左侧添加第一件模块</div>
            )}
            <hr className="divider" />
            <div className="spec">
              <b>共 {items.reduce((n, a) => n + M[a.type].mount, 0)} 处概念挂接点</b>含 V3
              夹持与专用承力接口，不能作为同一种节点直接采购。
            </div>
            <button
              className="primary"
              id="exportList"
              style={{ width: '100%', marginTop: 16 }}
              onClick={onExport}
            >
              导出配置清单 ↓
            </button>
            <p className="conceptnote">
              导出 JSON 包含模块、尺寸、位置、功能状态与所需接口，可作为后续网站接入和建模的输入。
            </p>
          </>
        ) : a ? (
          <ModuleDetails key={a.id} a={a} store={store} />
        ) : (
          <div className="empty">
            <b>选择一件模块</b>点击墙面上的模块，查看接口和功能。
            <br />
            也可以从左侧添加新模块。
          </div>
        )}
      </div>
    </aside>
  );
}
