import { MODULES as M } from '../model/index.js';
import { ModelPreview } from './ModelPreview.jsx';
export function Catalog({ state, store }) {
  const families = ['全部', '梯柱', '节点', '拓展'];
  const subkinds = Array.from(
    new Set(
      Object.values(M)
        .filter((m) => state.familyFilter === '全部' || m.family === state.familyFilter)
        .map((m) => m.subkind),
    ),
  );
  return (
    <aside className="catalog">
      <div className="filter" role="group" aria-label="模块大类">
        {families.map((x) => (
          <button
            key={x}
            data-filter={x}
            className={x === state.familyFilter ? 'active' : ''}
            onClick={() => store.setFamilyFilter(x)}
          >
            {x}
          </button>
        ))}
      </div>
      <label className="subfilter">
        <span>细分</span>
        <select value={state.subkindFilter} onChange={(e) => store.setSubkindFilter(e.target.value)}>
          <option value="全部">全部细分</option>
          {subkinds.filter(Boolean).sort().map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </label>
      <div className="cards">
        {Object.entries(M)
          .sort((a, b) => a[1].code.localeCompare(b[1].code))
          .filter(
            ([k, m]) =>
              (state.familyFilter === '全部' || m.family === state.familyFilter) &&
              (state.subkindFilter === '全部' || m.subkind === state.subkindFilter),
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
    </aside>
  );
}
