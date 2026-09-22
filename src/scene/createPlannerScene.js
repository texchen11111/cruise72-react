import * as THREE from 'three';
import {OrbitControls} from '/vendor/OrbitControls.js';
import {MODULES as M,ORIGIN,PITCH,valid,position,conflict,envelope} from '../model.js';

// Existing geometry, shading, camera and animation parameters are retained.
// React mounts this renderer once and disposes it on unmount.
export function createPlannerScene(stage,store){
 let {items,selected,night,view}=store.getSnapshot();
 let exiting=[],models=new Map(),frame=0,observer=null,unsubscribe=()=>{},revision=store.getSnapshot().sceneRevision,viewRevision=store.getSnapshot().viewRevision;
 const listeners=[];
 const listen=(target,event,callback)=>{target.addEventListener(event,callback);listeners.push(()=>target.removeEventListener(event,callback));};
// 3D scene. All geometry uses metres; original V3 dimensions converted from mm.
let renderer,scene,camera,orbit,ambient,sun,wallMat,floorMat,selectionBox,dimensionGroup;const clock=new THREE.Clock();
const mat=(c,metal=0)=>new THREE.MeshStandardMaterial({color:c,metalness:metal,roughness:.55});
const silver=mat('#aeb8c6',.5),orange=mat('#ed8e40'),dark=mat('#343e4e'),white=mat('#edece7'),glass=new THREE.MeshPhysicalMaterial({color:'#b9d2df',transparent:true,opacity:.23,roughness:.12,metalness:.12,depthWrite:false,side:THREE.DoubleSide});
function cube(g,w,h,d,x,y,z,m){const q=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);q.position.set(x,y,z);q.castShadow=true;q.receiveShadow=true;g.add(q);return q;}
function cylinder(g,r,h,x,y,z,m,axis='y'){const q=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,20),m);q.position.set(x,y,z);if(axis==='x')q.rotation.z=Math.PI/2;if(axis==='z')q.rotation.x=Math.PI/2;q.castShadow=true;g.add(q);return q;}
function textTexture(top,bottom,bg='#eee9db'){const c=document.createElement('canvas');c.width=768;c.height=512;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,768,512);ctx.fillStyle='#3158e8';ctx.fillRect(52,50,70,8);ctx.font='600 48px sans-serif';ctx.fillText(top,52,160);ctx.font='24px sans-serif';ctx.fillStyle='#627086';ctx.fillText(bottom,52,216);ctx.font='bold 135px sans-serif';ctx.fillStyle='#3158e8';ctx.fillText('72+',460,444);ctx.strokeStyle='#c8cbd1';ctx.beginPath();ctx.moveTo(52,300);ctx.lineTo(714,300);ctx.stroke();const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshStandardMaterial({map:t,roughness:.8});}
function node(g,x,y,co){const b=mat(co);cube(g,.048,.048,.048,x,y,.024,b);cube(g,.016,.004,.001,x,y,.0475,silver);}
function buildModule(a){if(!scene)return;const m=M[a.type],g=new THREE.Group(),colored=mat(a.color),[w,h,d]=[m.w,m.h,m.d];g.userData.id=a.id;g.position.set(...position(a));let act=null;
 if(a.type==='block')cube(g,w,h,d,0,0,d/2,colored);
 else if(a.type==='panel'||a.type==='acoustic'||a.type==='sign'){
 const depth=a.type==='panel'?.006:.025;cube(g,w,h,depth,0,0,.025,a.type==='acoustic'?mat('#829f9e'):white);
 if(a.type!=='acoustic'){const front=new THREE.Mesh(new THREE.PlaneGeometry(w-.012,h-.012),textTexture(a.type==='sign'?'WELCOME':'ON THE OCEAN','72+ / 48 mm system'));front.position.set(0,0,.025+depth/2+.001);g.add(front);}else for(let i=1;i<14;i++)cube(g,.002,h-.02,.002,-w/2+i*.048,0,.039,dark);

 }else if(a.type==='cabinet'){
 cube(g,w,.012,d,0,-h/2+.006,d/2,colored);cube(g,w,.012,d,0,h/2-.006,d/2,colored);for(const x of [-w/2+.006,w/2-.006])cube(g,.012,h,d,x,0,d/2,colored);cube(g,w,h,.008,0,0,.004,white);cube(g,w-.03,.006,d-.04,0,-.025,d/2,glass);cube(g,.12,.04,.12,-.15,-h/2+.032,d/2,white);cylinder(g,.035,.09,-.15,-h/2+.097,d/2,orange);cube(g,.10,.13,.08,.14,.043,d/2,white);
 act=new THREE.Group();act.position.set(-w/2+.008,0,d-.008);cube(act,w-.016,h-.03,.006,(w-.016)/2,0,0,glass);cube(act,.008,.07,.008,w-.05,0,.005,silver);g.add(act);
 }else if(a.type==='shelf'){
 cube(g,w,.02,d,0,-h/2+.01,d/2,colored);cube(g,w,.03,.01,0,-h/2+.035,d-.005,colored);for(const x of [-w/2+.025,w/2-.025])cube(g,.025,h-.02,.025,x,.01,.015,silver);for(let i=0;i<3;i++)cube(g,.085,.014,.15,-.16+i*.09,-h/2+.027,d/2,i===1?orange:white);
 }else if(a.type==='lamp'){
 cube(g,.048,.096,.016,0,0,.008,colored);cylinder(g,.012,.09,0,0,.06,silver,'z');const hinge=new THREE.Group();hinge.position.set(0,0,.135);hinge.rotation.x=Math.PI/4;cylinder(hinge,.04,.065,0,0,0,colored,'z');const disk=cylinder(hinge,.034,.003,0,0,.034,new THREE.MeshStandardMaterial({color:'#fff4d0',emissive:'#ffd08a',emissiveIntensity:1}),'z');g.add(hinge);const light=new THREE.SpotLight('#ffd08a',0,2.8,.6,.8,1.4);light.position.set(0,-.02,.16);light.target.position.set(0,-.65,.03);g.add(light,light.target);g.userData.light=light;g.userData.disk=disk;
 }else if(a.type==='scent'){
 cube(g,w,h,d,0,0,d/2,colored);cube(g,w-.024,h*.55,.004,0,-.03,d-.001,white);for(let i=0;i<5;i++)cube(g,w-.04,.003,.002,0,h/2-.02-i*.009,d-.001,dark);g.userData.particles=[];const pm=new THREE.MeshBasicMaterial({color:'#78c5cd',transparent:true,opacity:.5});for(let i=0;i<10;i++){const q=new THREE.Mesh(new THREE.SphereGeometry(.003,6,6),pm);g.add(q);g.userData.particles.push(q);}
 }else if(a.type==='rail'){
 cube(g,w-.048,.016,.016,0,0,.024,silver);
 }else if(a.type==='tray'){
 cube(g,w,.012,d,0,-h/2+.006,d/2,white);for(const x of [-w/2+.006,w/2-.006])cube(g,.012,.038,d,x,-h/2+.025,d/2,colored);cube(g,w,.038,.012,0,-h/2+.025,d-.006,colored);for(const x of [-w/2+.024,w/2-.024])cube(g,.016,.016,d-.048,x,-h/2+.03,d/2+.024,silver);for(let i=0;i<3;i++)cube(g,.085,.018,.095,-.16+i*.16,-h/2+.023,d/2,i===1?orange:white);
 }else if(a.type==='bookrest'){
 const face=new THREE.Group();face.rotation.x=-Math.PI/6;face.position.set(0,0,.12);cube(face,w,.34,.012,0,0,0,white);cube(face,w,.025,.04,0,-.16,.014,colored);
 const book=new THREE.Group();cube(book,w-.065,.29,.012,0,0,.012,white);const page=new THREE.Mesh(new THREE.PlaneGeometry(w-.08,.275),textTexture('VOYAGE / 72','Collected places · Open to explore'));page.position.z=.019;book.add(page);face.add(book);g.userData.book=book;g.add(face);for(const x of [-w/2+.024,w/2-.024])cube(g,.018,.018,.19,x,-.13,.13,silver);
 }else if(a.type==='worktop'){
 // Reserved 480 mm height/depth contains every intermediate fold angle.
 act=new THREE.Group();act.position.set(0,-h/2+.03,.02);cube(act,w,.022,.432,0,0,.216,colored);cube(act,w,.008,.008,0,.015,.426,colored);for(const x of [-w/2+.025,w/2-.025])cube(g,.025,h,.018,x,0,.009,silver);g.add(act);
 }
 if(a.type!=='block'){
 const xs=m.mount===4||a.type==='rail'?[-w/2+.024,w/2-.024]:[0];const ys=a.type==='rail'?[0]:[-h/2+.024,h/2-.024];
 for(const x of xs)for(const y of ys)node(g,x,y,a.color);
 if(m.mount===4)for(const y of ys)cube(g,w-.048,.012,.012,0,y,.018,silver);
 }
 g.userData.act=act;if(act){if(a.type==='worktop')act.rotation.x=a.state?0:-Math.PI/2;if(a.type==='cabinet')act.rotation.y=a.state?-Math.PI/2:0;}g.traverse(o=>{if(o.isMesh)o.userData.itemId=a.id;});scene.add(g);g.userData.type=a.type;g.userData.color=a.color;models.set(a.id,g);return g;}
function dispose(g){if(!g)return;scene.remove(g);g.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material&&!Object.values({silver,orange,dark,white,glass}).includes(o.material)){o.material.map?.dispose();o.material.dispose();}});}
function rebuild(a){dispose(models.get(a.id));buildModule(a);updateSelection();}
function updateSelection(){if(!selectionBox)return;const a=items.find(x=>x.id===selected);selectionBox.visible=!!a;if(a){const e=envelope(a);selectionBox.box.min.set(...e.min.map((v,i)=>v*PITCH+ORIGIN[i]));selectionBox.box.max.set(...e.max.map((v,i)=>v*PITCH+ORIGIN[i]));}}
function dimensions(){const g=new THREE.Group();const points=[];for(let i=0;i<=60;i++){const x=ORIGIN[0]+i*PITCH,y=ORIGIN[1]+i*PITCH;points.push(x,.01,.002,x,2.89,.002,-1.44,y,.002,1.44,y,.002);}for(let z=0;z<=24;z++){const d=z*PITCH;points.push(-1.44,.005,d,1.44,.005,d);}for(let x=0;x<=60;x++){const v=-1.44+x*PITCH;points.push(v,.005,0,v,.005,24*PITCH);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.add(new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:'#8a9ab1',transparent:true,opacity:.27})));g.visible=true;scene.add(g);return g;}
function init3D(){scene=new THREE.Scene();scene.background=new THREE.Color('#f0f2f5');renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;stage.prepend(renderer.domElement);camera=new THREE.PerspectiveCamera(40,1,.01,80);orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.minDistance=1.8;orbit.maxDistance=8;orbit.maxPolarAngle=Math.PI/2+.08;orbit.minAzimuthAngle=-Math.PI/2.5;orbit.maxAzimuthAngle=Math.PI/2.5;orbit.target.set(0,1.35,0);camera.position.set(3.7,2.4,5.8);orbit.update();ambient=new THREE.HemisphereLight('#ffffff','#798192',2.5);scene.add(ambient);sun=new THREE.DirectionalLight('#fff7e9',3);sun.position.set(-3,5,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-3;sun.shadow.camera.right=3;sun.shadow.camera.top=4;sun.shadow.camera.bottom=-1;sun.shadow.normalBias=.008;scene.add(sun);wallMat=mat('#f5f4ef');floorMat=mat('#d9dde3');cube(scene,2.9,2.9,.10,0,1.45,-.05,wallMat);cube(scene,9,.04,6,0,-.022,1.3,floorMat);// Secondary mounting frame is illustrative; exact rail adapter design remains unverified.
 for(const x of [-1.2,-.48,.24,.96])cube(scene,.018,2.88,.018,x,1.45,-.002,silver);
 dimensionGroup=dimensions();selectionBox=new THREE.Box3Helper(new THREE.Box3(),0x3158e8);selectionBox.material.depthTest=false;selectionBox.material.transparent=true;selectionBox.material.opacity=.6;scene.add(selectionBox);for(const a of items)buildModule(a);observer=new ResizeObserver(resize);observer.observe(stage);resize();setupPointer();animate();}
function resize(){if(!renderer)return;const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
function setView(v){if(!orbit)return;view=v;orbit.enableRotate=v==='3d';orbit.target.set(0,1.4,0);camera.position.set(v==='front'?0:3.7,v==='front'?1.4:2.4,v==='front'?6.1:5.8);orbit.update();}
function animate(){frame=requestAnimationFrame(animate);const t=clock.getElapsedTime();for(const g of [...exiting]){g.scale.multiplyScalar(.8);if(g.scale.x<.02){dispose(g);exiting=exiting.filter(x=>x!==g);}}for(const a of items){const g=models.get(a.id);if(!g)continue;if(g.userData.transition){g.position.lerp(new THREE.Vector3(...position(a)),.13);g.scale.lerp(new THREE.Vector3(1,1,1),.15);if(g.position.distanceTo(new THREE.Vector3(...position(a)))<.001&&g.scale.x>.999){g.position.set(...position(a));g.scale.setScalar(1);g.userData.transition=false;}}else g.position.set(...position(a));if(g.userData.book)g.userData.book.visible=!a.state;const act=g.userData.act;if(act){if(a.type==='cabinet')act.rotation.y=THREE.MathUtils.lerp(act.rotation.y,a.state?-Math.PI/2:0,.12);if(a.type==='worktop')act.rotation.x=THREE.MathUtils.lerp(act.rotation.x,a.state?0:-Math.PI/2,.12);}if(g.userData.light){const l=g.userData.light;l.intensity=THREE.MathUtils.lerp(l.intensity,a.state?a.intensity*.017:0,.1);const color=a.temperature===2700?'#ffbd67':a.temperature===3200?'#ffd794':'#fff0d2';l.color.set(color);g.userData.disk.material.emissive.set(color);g.userData.disk.material.emissiveIntensity=a.state?a.intensity/55:0;}if(g.userData.particles){g.userData.particles.forEach((p,i)=>{p.visible=!!a.state;const ph=(t*.3+i/10)%1;p.position.set(Math.sin(t+i)*.013,.12+ph*.18,.144+ph*.05);});}}
 ambient.intensity=THREE.MathUtils.lerp(ambient.intensity,night?.52:2.5,.04);sun.intensity=THREE.MathUtils.lerp(sun.intensity,night?.28:3,.04);const bg=new THREE.Color(night?'#6b768b':'#f0f2f5');scene.background.lerp(bg,.04);orbit.update();updateSelection();renderer.render(scene,camera);}
function setupPointer(){const canvas=renderer.domElement,ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,0,1),0);let drag=null;
 const get=e=>{const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);};
 const point=e=>{get(e);return ray.ray.intersectPlane(plane,new THREE.Vector3());};
 listen(canvas,'pointerdown',e=>{if(e.button!==0)return;get(e);const hit=ray.intersectObjects([...models.values()],true)[0];if(!hit)return;const a=items.find(x=>x.id===hit.object.userData.itemId);if(!a)return;store.select(a.id);plane.constant=-a.gz*PITCH;const start=point(e);if(!start)return;drag={id:a.id,start,a:{...a},px:e.clientX,py:e.clientY,moved:false,blocked:false};orbit.enabled=false;canvas.setPointerCapture(e.pointerId);});
 listen(canvas,'pointermove',e=>{if(!drag||Math.hypot(e.clientX-drag.px,e.clientY-drag.py)<5)return;const p=point(e);if(!p)return;const a=items.find(x=>x.id===drag.id),test={...a,gx:drag.a.gx+Math.round((p.x-drag.start.x)/PITCH),gy:drag.a.gy+Math.round((p.y-drag.start.y)/PITCH)};drag.blocked=!valid(test)||!!conflict(test,items);selectionBox.material.color.set(drag.blocked?'#e25743':'#3158e8');if(!drag.blocked){store.moveItem(a.id,{gx:test.gx,gy:test.gy},false);drag.moved=true;}});
 const release=()=>{if(drag?.moved){store.changed();}if(drag?.blocked)store.toast('该位置超界或重叠，保留上一个可用格位');drag=null;orbit.enabled=true;selectionBox.material.color.set('#3158e8');};listen(canvas,'pointerup',release);listen(canvas,'pointercancel',release);
 listen(stage,'dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';});listen(stage,'drop',e=>{e.preventDefault();const type=e.dataTransfer.getData('text/plain');if(!M[type])return;plane.constant=0;const p=point(e);if(!p)return;store.addItem(type,Math.round((p.x-ORIGIN[0])/PITCH-M[type].cells[0]/2),Math.round((p.y-ORIGIN[1])/PITCH-M[type].cells[1]/2),0,null,true);});
}

 function sync(){const s=store.getSnapshot();items=s.items;selected=s.selected;night=s.night;
  const switching=revision!==s.sceneRevision;revision=s.sceneRevision;
  for(const [id,g] of models)if(!items.some(a=>a.id===id&&a.type===g.userData.type)){if(switching)exiting.push(g);else dispose(g);models.delete(id);}
  for(const a of items){const g=models.get(a.id);if(!g){const n=buildModule(a);if(switching){n.scale.setScalar(.02);n.userData.transition=true;}}else {if(g.userData.color!==a.color)rebuild(a);if(switching)models.get(a.id).userData.transition=true;}}
  if(dimensionGroup)dimensionGroup.visible=s.showDims;if(viewRevision!==s.viewRevision){setView(s.view);viewRevision=s.viewRevision;}updateSelection();
 }
 function destroy(){cancelAnimationFrame(frame);observer?.disconnect();unsubscribe();listeners.forEach(fn=>fn());orbit?.dispose();
  const geometries=new Set(),materials=new Set(),textures=new Set();scene?.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m){materials.add(m);if(m.map)textures.add(m.map);}});
  geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());renderer?.dispose();renderer?.domElement.remove();models.clear();
 }
 try{init3D();unsubscribe=store.subscribe(sync);}catch(error){destroy();throw error;}
 return {resetView:()=>setView(store.getSnapshot().view),snapshot:()=>{renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');},destroy};
}
