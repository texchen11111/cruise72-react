import {MODULES as M,PRESETS,clone,GRID,cells,valid,clampPosition,conflict,findSpace} from './model.js';

// React reads immutable snapshots through useSyncExternalStore. Three.js consumes
// the same state; it never owns or rewrites the React interface.
export function createPlannerStore() {
 let state={items:clone(PRESETS[0].items),selected:'b',preset:0,filter:'全部',rightTab:'detail',view:'3d',viewRevision:0,playing:false,night:false,dirty:false,showDims:true,gridTouched:false,sceneRevision:0,toast:'',error:''};
 let uid=100, timer=null, toastTimer=null;
 const listeners=new Set();
 const update=patch=>{state={...state,...patch};listeners.forEach(fn=>fn());};
 const toast=text=>{clearTimeout(toastTimer);update({toast:text});toastTimer=setTimeout(()=>update({toast:''}),3200);};
 const stopPlay=()=>{clearInterval(timer);timer=null;update({playing:false});};
 const changed=()=>{clearInterval(timer);timer=null;update({dirty:true,playing:false});};
 const select=id=>update({selected:id,rightTab:'detail'});
 function moveItem(id,patch,commit=true){
  const a=state.items.find(x=>x.id===id);if(!a)return false;
  if(Object.values(patch).some(v=>!Number.isFinite(v))){if(commit)toast('请输入有效格坐标');return false;}
  const next={...a,...patch};for(const k of ['gx','gy','gz'])next[k]=Math.round(next[k]);
  if(!valid(next)||conflict(next,state.items)){if(commit)toast('超出网格或占位重叠：请换一个位置');return false;}
  update({items:state.items.map(x=>x.id===id?next:x)});if(commit)changed();return true;
 }
 function addItem(type,gx=23,gy=26,gz=0,from=null,exact=false){
  if(!M[type])return;
  const candidate=clampPosition({...from,id:'new',type,gx,gy,gz,state:from?.state||0,color:from?.color||'#3158e8',intensity:from?.intensity||65,temperature:from?.temperature||3200});
  const free=exact?(!conflict(candidate,state.items)?candidate:null):findSpace(type,state.items,gx,gy,gz,from||{});
  if(!free){toast('此层没有可用位置，请调整坐标或移除模块');return;}
  const a={...free,id:'u'+uid++};update({items:[...state.items,a],selected:a.id,rightTab:'detail'});changed();toast('已添加'+M[type].name+' · '+M[type].cells.join(' × ')+' 格');return a;
 }
 function setPreset(i){if(!PRESETS[i])return;update({preset:i,dirty:false,night:PRESETS[i].ambient==='night',items:clone(PRESETS[i].items),selected:PRESETS[i].items[0]?.id,sceneRevision:state.sceneRevision+1});}
 function patchItem(id,patch){update({items:state.items.map(a=>a.id===id?{...a,...patch}:a)});changed();}
 function toggleState(id){const a=state.items.find(x=>x.id===id);if(!a)return;const next={...a,state:a.state?0:1};if(!valid(next)){toast('切换后的活动包络超出网格，请先调整位置');return;}if(conflict(next,state.items)){toast('切换后会与相邻模块重叠，请先调整位置');return;}patchItem(id,{state:next.state});}
 function remove(id){update({items:state.items.filter(a=>a.id!==id),selected:null});changed();}
 function duplicate(id){const a=state.items.find(x=>x.id===id);if(a)addItem(a.type,a.gx+1,a.gy+1,a.gz,a);}
 function exportData(){return {project:'邮轮72变',version:'grid48-1',wall_mm:[2900,2900],grid:{unit_mm:48,counts:GRID,origin_wall_mm:[10,10,0],axes:['左右','上下','离墙']},scene:PRESETS[state.preset].name,modified:state.dirty,warning:'整数格为占位与布局规则，材料厚度可小于一格。48mm背部适配系统、离墙叠放及承载待工程验证。',modules:state.items.map(a=>({...a,name:M[a.type].name,position_cells:[a.gx,a.gy,a.gz],position_grid_mm:[a.gx,a.gy,a.gz].map(v=>v*48),size_cells:M[a.type].cells,dimensions_mm:M[a.type].cells.map(v=>v*48),reserved_cells:cells(a),interface:M[a.type].anchor,standard_parts:M[a.type].parts}))};}
 return {getSnapshot:()=>state,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},toast,changed,select,moveItem,addItem,setPreset,patchItem,toggleState,remove,duplicate,exportData,stopPlay,
 setFilter:filter=>update({filter}),setTab:rightTab=>update({rightTab}),setView:view=>update({view,viewRevision:state.viewRevision+1}),setError:error=>update({error}),
 toggleGrid:()=>update({showDims:!state.showDims,gridTouched:true}),
 togglePlay:()=>{if(state.playing){stopPlay();return;}update({playing:true});timer=setInterval(()=>setPreset((state.preset+1)%PRESETS.length),6500);},
 destroy:()=>{clearInterval(timer);clearTimeout(toastTimer);listeners.clear();}
 };
}
