import { MODULES as M } from '../model/index.js';
import { ModelPreview } from './ModelPreview.jsx';
export function Catalog({ state, store }) {
  return (
    <aside className="catalog">
      <div className="eyebrow">72+ / COLLECTION</div>
      <h2>模块系列</h2>
      <div className="sub">48 mm 基础节点 · 整数组合</div>
      <div className="filter" role="group" aria-label="模块分类">
        {['全部', '节点', '连接件', '展陈', '氛围', '服务'].map((x) => (
          <button
            key={x}
            data-filter={x}
            className={x === state.filter ? 'active' : ''}
            onClick={() => store.setFilter(x)}
          >
            {x}
          </button>
        ))}
      </div>
      <div className="cards">
        {Object.entries(M)
          .sort((a, b) => a[1].code.localeCompare(b[1].code))
          .filter(
            ([k, m]) =>
              state.filter === '全部' ||
              (state.filter === '节点' ? k === 'block' : m.kind === state.filter),
          )
          .map(([k, m]) => (
            <button
              key={k}
              className="card"
              data-add={k}
              draggable="true"
              aria-label={'添加' + m.name}
              onClick={() => store.addItem(k)}
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', k);
                e.dataTransfer.effectAllowed = 'copy';
              }}
            >
              <span className="num">{m.code}</span>
              <span className="addmark">＋</span>
              <ModelPreview type={k} />
              <strong>{m.name}</strong>
              <small>{m.cells.map((n) => n * 48).join(' × ')} mm</small>
            </button>
          ))}
      </div>
      <div className="catalognote">
        <b>节点 × 连接件 × 展示面</b>从一个48
        mm立方节点开始，以横杆和承托件连接不同展示面。组合整体按整数格占位，三轴移动以48 mm为一步。
        <br />
        <br />
        拖动调整左右 / 上下位置；右侧调节离墙层数。网格不等同于已经实现的安装点。
      </div>
    </aside>
  );
}
