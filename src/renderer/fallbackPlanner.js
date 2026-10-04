import { MODULES as M, GRID, PITCH, cells } from '../core/index.js';

// Keep the configurator useful when the host browser blocks WebGL.  This is a
// plan-view fallback, not a second renderer: it reads the same store and model
// envelopes used by the 3D scene, so selection, presets and the inspector keep
// working while the user can install/enable WebGL later.
export function createFallbackPlanner(stage, store) {
  const root = document.createElement('div');
  root.className = 'fallback-plan';
  const title = document.createElement('div');
  title.className = 'fallback-title';
  title.textContent = '平面预览 · 三维场景暂不可用';
  const wall = document.createElement('div');
  wall.className = 'fallback-wall';
  root.append(title, wall);
  stage.append(root);
  const paint = () => {
    const state = store.getSnapshot();
    wall.replaceChildren();
    for (const a of state.items) {
      const c = cells(a);
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className =
        'fallback-module' + (a.id === state.selected ? ' selected' : '');
      tile.dataset.itemId = a.id;
      tile.style.left = `${(a.gx / GRID[0]) * 100}%`;
      tile.style.bottom = `${(a.gy / GRID[1]) * 100}%`;
      tile.style.width = `${Math.max(2, (c[0] / GRID[0]) * 100)}%`;
      tile.style.height = `${Math.max(2, (c[1] / GRID[1]) * 100)}%`;
      tile.style.background = a.color || '#3158e8';
      tile.title = `${M[a.type].name} · ${c.map((v) => v * (PITCH * 1000)).join(' × ')} mm`;
      tile.textContent = M[a.type].name;
      tile.addEventListener('click', () => store.select(a.id));
      wall.append(tile);
    }
  };
  const unsubscribe = store.subscribe(paint);
  paint();
  return {
    resetView: () => {},
    snapshot: () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="#f0f2f5"/>${store
        .getSnapshot()
        .items.map((a) => {
          const c = cells(a);
          const x = (a.gx / GRID[0]) * 600;
          const y = 600 - ((a.gy + c[1]) / GRID[1]) * 600;
          const width = (c[0] / GRID[0]) * 600;
          const height = (c[1] / GRID[1]) * 600;
          return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${a.color || '#3158e8'}"/>`;
        })
        .join('')}</svg>`;
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    },
    destroy: () => {
      unsubscribe();
      root.remove();
    },
  };
}
