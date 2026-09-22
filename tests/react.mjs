import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {renderToStaticMarkup} from 'react-dom/server';
import {createPlannerStore} from '../src/store.js';
import * as model from '../src/model.js';
const temporary=path.resolve('node_modules/.cache/react-regression.mjs');fs.mkdirSync(path.dirname(temporary),{recursive:true});
await build({entryPoints:['src/App.jsx'],outfile:temporary,bundle:true,platform:'node',format:'esm',jsx:'automatic',packages:'external',plugins:[{name:'renderer-test-double',setup(b){b.onResolve({filter:/createPlannerScene\.js$/},()=>({path:'scene',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export function createPlannerScene(){globalThis.__sceneMounts++;return {destroy(){globalThis.__sceneUnmounts++},resetView(){},snapshot(){return "data:image/png;base64,test"}}}'}));}}]});
const {default:App}=await import(temporary+'?test');
const store=createPlannerStore();
// Optional one-time comparison against the pre-migration DOM captured in scratch.
const baseline='/tmp/cruise72-legacy-dom.js';
if(fs.existsSync(baseline)){
 const old=new JSDOM('<div id="app"></div>',{runScripts:'outside-only'});Object.assign(old.window,{M:model.MODULES,...model});old.window.eval(fs.readFileSync(baseline,'utf8'));
 const actual=new JSDOM('<div id="app">'+renderToStaticMarkup(React.createElement(App,{store}))+'</div>');
 // Compare structure, attributes and user text; React may split a text node around expressions.
 const flat=doc=>[...doc.querySelectorAll('#app *')].map(el=>({tag:el.tagName,attrs:[...el.attributes].filter(a=>!(a.name==='class'&&!a.value)).map(a=>[a.name,a.name==='style'?a.value.replace(/;$/,''):a.value]).sort(),text:el.textContent.replace(/\s+/g,' ').trim()}));
 assert.deepEqual(flat(actual.window.document),flat(old.window.document),'initial React DOM preserves original structure and copy');old.window.close();actual.window.close();console.log('Initial DOM parity with original page passed.');
}
const dom=new JSDOM('<div id="app"></div>',{url:'https://example.test'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true,__sceneMounts:0,__sceneUnmounts:0});
const root=createRoot(document.getElementById('app'));
const click=async selector=>{const e=document.querySelector(selector);assert.ok(e,selector);await act(()=>e.dispatchEvent(new window.MouseEvent('click',{bubbles:true})));};
try{
await act(()=>root.render(React.createElement(App,{store})));
assert.equal(document.querySelectorAll('[data-add]').length,9);
await click('[data-filter="氛围"]');assert.equal(document.querySelectorAll('[data-add]').length,3);
await click('[data-filter="全部"]');await click('[data-add="block"]');assert.equal(store.getSnapshot().items.length,7);
await click('#duplicate');assert.equal(store.getSnapshot().items.length,8);await click('#remove');assert.equal(store.getSnapshot().items.length,7);
await click('[data-scene="1"]');assert.equal(document.querySelector('#sceneTitle').textContent,'亲子工作坊');
await click('[data-tab="list"]');assert.equal(document.querySelectorAll('[data-select]').length,6);await click('[data-select="e"]');
assert.equal(document.querySelector('#intensity').value,'65');await click('#toggleState');assert.equal(store.getSnapshot().items.find(a=>a.id==='e').state,0);
await click('[data-color="#ed8e40"]');assert.equal(store.getSnapshot().items.find(a=>a.id==='e').color,'#ed8e40');
const initial=store.getSnapshot().items.find(a=>a.id==='e').gz;
await act(()=>window.dispatchEvent(new window.KeyboardEvent('keydown',{key:'PageUp',bubbles:true})));assert.equal(store.getSnapshot().items.find(a=>a.id==='e').gz,initial+1);
await click('#dims');assert.equal(document.querySelector('#dims').getAttribute('aria-pressed'),'false');
await click('#play');assert.equal(document.querySelector('#play').textContent,'Ⅱ 暂停演示');await click('#play');
await click('[data-view="front"]');assert.equal(store.getSnapshot().view,'front');
assert.equal(globalThis.__sceneMounts,1,'React updates must not remount Three.js');
await act(()=>root.unmount());assert.equal(globalThis.__sceneUnmounts,1,'React unmount disposes renderer');assert.equal(window.__planner,undefined);
console.log('React DOM interactions and renderer lifecycle passed (WebGL renderer mocked; not a browser visual test).');
}finally{store.destroy();dom.window.close();fs.rmSync(temporary,{force:true});}
