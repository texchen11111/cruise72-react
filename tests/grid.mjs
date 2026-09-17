import assert from 'node:assert/strict';
import {MODULES as M,PRESETS,GRID,cells,valid,position,conflict,findSpace} from '../dist/model.js';
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++};
for(const p of PRESETS)for(const a of p.items){ok(valid(a),p.id+' bounds '+a.id);ok(!conflict(a,p.items),p.id+' conflict '+a.id);const toggled={...a,state:a.state?0:1};ok(valid(toggled)&&!conflict(toggled,p.items),p.id+' state '+a.id);}
const a={id:'a',type:'block',gx:4,gy:4,gz:4,state:0};
for(const [i,k] of ['gx','gy','gz'].entries()){
 const adjacent={...a,id:'b',[k]:5};ok(!conflict(adjacent,[a]),'touching axis '+k);
 const overlap={...a,id:'b'};ok(conflict(overlap,[a]),'overlap '+k);
 const moved={...a,[k]:a[k]+1};ok(Math.abs(position(moved)[i]-position(a)[i]-.048)<1e-10,'48mm movement '+k);
 ok(!valid({...a,[k]:GRID[i]}),'outside '+k);ok(!valid({...a,[k]:-1}),'negative '+k);
 ok(!valid({...a,[k]:1.5}),'fraction '+k);
}
for(const type of Object.keys(M)){const all=[];for(let i=0;i<20;i++){const b=findSpace(type,all,23,25,0);if(!b)break;b.id=type+i;ok(valid(b)&&!conflict(b,all),'add '+type);all.push(b);}}
const cabinet={id:'c',type:'cabinet',gx:0,gy:0,gz:0,state:0}, b={...a,id:'b',gx:1,gy:1,gz:8};ok(!conflict(cabinet,[b]),'closed front space');ok(conflict({...cabinet,state:1},[b]),'door reserve');
const deep={...a,id:'deep',gz:5};ok(!conflict(deep,[a]),'same XY different Z');
ok(cells({type:'worktop',state:0}).join()==cells({type:'worktop',state:1}).join(),'fold reserve retained');
console.log(checks+' grid assertions passed; all 4 presets valid.');
