import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createPlannerStore } from '../src/store/index.js';
const temporary = path.resolve('node_modules/.cache/react-regression.mjs');
fs.mkdirSync(path.dirname(temporary), { recursive: true });
await build({
  entryPoints: ['src/App.jsx'],
  outfile: temporary,
  bundle: true,
  platform: 'node',
  format: 'esm',
  jsx: 'automatic',
  packages: 'external',
  loader: { '.css': 'empty' },
  plugins: [
    {
      name: 'renderer-test-double',
      setup(b) {
        b.onResolve({ filter: /createPlannerScene\.js$/ }, () => ({
          path: 'scene',
          namespace: 'test',
        }));
        b.onLoad({ filter: /.*/, namespace: 'test' }, () => ({
          contents:
            'export function generatePreview(){return null;} export function createPlannerScene(){globalThis.__sceneMounts++;return {destroy(){globalThis.__sceneUnmounts++},resetView(){},snapshot(){return "data:image/png;base64,test"}}}',
        }));
      },
    },
  ],
});
const { default: App } = await import(temporary + '?test');
const store = createPlannerStore();
const dom = new JSDOM('<div id="app"></div>', { url: 'https://example.test' });
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true,
  __sceneMounts: 0,
  __sceneUnmounts: 0,
});
dom.window.HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute('open', '');
};
const root = createRoot(document.getElementById('app'));
const click = async (selector) => {
  const e = document.querySelector(selector);
  assert.ok(e, selector);
  await act(() =>
    e.dispatchEvent(new window.MouseEvent('click', { bubbles: true })),
  );
};
try {
  await act(() => root.render(React.createElement(App, { store })));
  assert.equal(document.querySelectorAll('[data-add]').length, 17);
  assert.equal(
    document.querySelectorAll('.floating-panel:not([hidden])').length,
    0,
  );
  const hover = document.querySelector('[aria-controls="catalog-panel"]');
  await act(() => {
    const event = new window.Event('pointerover', { bubbles: true });
    Object.defineProperty(event, 'pointerType', { value: 'mouse' });
    hover.dispatchEvent(event);
  });
  assert.equal(
    document.getElementById('catalog-panel').hidden,
    false,
    'hover opens catalog',
  );
  await act(() => {
    hover.dispatchEvent(new window.Event('pointerout', { bubbles: true }));
  });
  await act(() => new Promise((resolve) => setTimeout(resolve, 260)));
  assert.equal(
    document.getElementById('catalog-panel').hidden,
    true,
    'hover leave closes',
  );
  await click('[aria-controls="catalog-panel"]');
  assert.equal(
    document.getElementById('catalog-panel').hidden,
    false,
    'touch/click opens',
  );
  await click('[aria-label="收起模块自定义"]');
  assert.equal(document.getElementById('catalog-panel').hidden, true);
  const savedItems = JSON.stringify(store.getSnapshot().items);
  await click('.render-toggle');
  assert.ok(document.querySelector('.render-overlay[open]'));
  await click('[aria-label="下一张效果图"]');
  assert.match(document.querySelector('.render-image img').src, /shelves/);
  await act(() => {
    document.querySelector('.render-overlay').dispatchEvent(
      new window.KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
      }),
    );
  });
  assert.match(document.querySelector('.render-image img').src, /reading/);
  assert.equal(JSON.stringify(store.getSnapshot().items), savedItems);
  await act(() => {
    document
      .querySelector('.render-overlay')
      .dispatchEvent(new window.Event('cancel', { cancelable: true }));
  });
  assert.equal(document.querySelector('.render-overlay'), null);
  assert.equal(globalThis.__sceneMounts, 1, 'overlays preserve the renderer');
  await click('[data-filter="节点"]');
  assert.equal(document.querySelectorAll('[data-add]').length, 2);
  await click('[data-filter="拓展"]');
  assert.equal(document.querySelectorAll('[data-add]').length, 14);
  await click('[data-filter="全部"]');
  await click('[data-add="block"]');
  assert.equal(store.getSnapshot().items.length, 11);
  await click('#duplicate');
  assert.equal(store.getSnapshot().items.length, 12);
  await click('#remove');
  assert.equal(store.getSnapshot().items.length, 11);
  await click('[data-scene="1"]');
  assert.equal(document.querySelector('#sceneTitle').textContent, '共创空间');
  await click('[data-tab="list"]');
  assert.equal(document.querySelectorAll('[data-select]').length, 10);
  await click('[data-select="e"]');
  assert.equal(document.querySelector('#intensity').value, '65');
  await click('#toggleState');
  assert.equal(store.getSnapshot().items.find((a) => a.id === 'e').state, 0);
  await click('[data-color="#ed8e40"]');
  assert.equal(
    store.getSnapshot().items.find((a) => a.id === 'e').color,
    '#ed8e40',
  );
  const initial = store.getSnapshot().items.find((a) => a.id === 'e').gz;
  await act(() =>
    window.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'PageUp', bubbles: true }),
    ),
  );
  assert.equal(
    store.getSnapshot().items.find((a) => a.id === 'e').gz,
    initial + 1,
  );
  await click('#dims');
  assert.equal(
    document.querySelector('#dims').getAttribute('aria-pressed'),
    'false',
  );
  await click('#play');
  assert.equal(document.querySelector('#play').textContent, 'Ⅱ 暂停演示');
  await click('#play');
  await click('[data-view="front"]');
  assert.equal(store.getSnapshot().view, 'front');
  await click('[data-scene="0"]');
  assert.equal(document.querySelectorAll('[data-exhibition]').length, 4);
  assert.ok(!document.querySelector('.time'));
  await click('[data-exhibition="1"]');
  assert.ok(
    document.querySelector('#sceneTitle').textContent.includes('层架陈列'),
  );
  assert.ok(
    document.querySelector('.transition-note').textContent.includes('保留'),
  );
  await click('[data-exhibition="2"]');
  await click('[data-tab="list"]');
  await click('[data-select="r1"]');
  assert.ok(
    document.querySelector('.assembly-spec').textContent.includes('50 mm'),
  );
  await click('#toggleState');
  assert.equal(document.querySelector('#toggleState').textContent, '已取阅');
  dom.window.HTMLElement.prototype.scrollIntoView = function () {};
  assert.equal(
    globalThis.__sceneMounts,
    1,
    'React updates must not remount Three.js',
  );
  await act(() => root.unmount());
  assert.equal(
    globalThis.__sceneUnmounts,
    1,
    'React unmount disposes renderer',
  );
  assert.equal(window.__planner, undefined);
  console.log(
    'React DOM interactions and renderer lifecycle passed (WebGL renderer mocked; not a browser visual test).',
  );
} finally {
  store.destroy();
  dom.window.close();
  fs.rmSync(temporary, { force: true });
}
