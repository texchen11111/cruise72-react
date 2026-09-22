export const PITCH=.048, GRID=[60,60,24], ORIGIN=[-1.44,.01,0];
export const MODULES={
 panel:{name:'平面展陈',en:'DISPLAY',code:'01',w:.700,h:.550,d:.006,kind:'展陈',anchor:'V3 夹持节点 × 4',level:'沿用节点',intro:'保留四角框选的视觉语言，夹持照片、海报与薄板作品。',mechanism:'两根圆导柱调节夹持深度；下部承托台阶接住底边，上部节点限制前倾。节点背部挂钩始终向下。',parts:'Ø6 圆轴、M3 锁紧件、轴尾止挡、裁切软垫。长度与配合需按实体复核。',note:'展示 700 × 550 × 6 mm 板材；2–12 mm 厚度仍属拟定验证范围。',mount:4,draw:'frame',power:false},
 cabinet:{name:'透明展柜',en:'VITRINE',code:'02',w:.660,h:.500,d:.280,kind:'展陈',anchor:'承力背架 × 1 + 挂接点 × 4',level:'新增承力结构',intro:'为模型、工艺品与航线纪念物提供可关闭的展示空间。',mechanism:'柜体先连接刚性背架，背架跨两根梯柱，上下四点挂接并独立防抬。柜门限位、闭锁，底板前沿设止滑挡边。',parts:'金属挂钩、贯穿紧固件、柜门铰链、限位件、机械门锁、透明板材。',note:'不能由现有伸缩圆轴悬挑承重；需要背架及整柜载荷试验。',mount:4,draw:'cabinet',power:false},
 lamp:{name:'定向灯具',en:'LIGHT',code:'03',w:.180,h:.160,d:.180,kind:'氛围',anchor:'窄背板双挂点 + 转向接头',level:'新增功能机芯',intro:'同一盏灯在展品照明、阅读和晚间活动之间转换。',mechanism:'灯头用转向关节接入窄背板；低压线沿专用线槽布置，独立插头供电，不通过伸缩导柱导电。',parts:'LED 模组、匹配驱动器、转向关节、低压连接器与固定线夹。',note:'页面亮度与色温为视觉演示，不代表照度、散热或电气认证。',mount:2,draw:'lamp',power:true},
 scent:{name:'香氛盒',en:'SCENT',code:'04',w:.120,h:.220,d:.130,kind:'氛围',anchor:'窄背板双挂点 + 抽换芯盒',level:'新增功能机芯',intro:'在限定的休憩区域提供可关闭、可替换的局部香氛体验。',mechanism:'可拆芯盒装入外壳；底部容纳密封耗材，微型风扇从独立风道送风。挂接接口与耗材仓分离。',parts:'低压微型风扇、风量控制件、密封盒、密封圈和低压接头。',note:'默认关闭；公共活动优先无香。气流动画仅为示意，不代表真实扩散范围。',mount:2,draw:'scent',power:true},
 shelf:{name:'陈列层板',en:'SHELF',code:'05',w:.660,h:.080,d:.280,kind:'服务',anchor:'承托支架 × 2 + 挂接点 × 4',level:'新增承力结构',intro:'放置图录、样品与轻型展示物，连接展陈与临时服务。',mechanism:'两侧支架将悬挑力传回梯柱，上下挂点形成抗倾覆力偶；层板前沿增加挡边。',parts:'金属承托臂、连接螺钉、防抬销与表面防滑垫。',note:'不展示未经测试的承重数值；选品与安装高度需结合通行空间。',mount:4,draw:'shelf',power:false},
 sign:{name:'活动信息牌',en:'WAYFINDING',code:'06',w:.300,h:.180,d:.030,kind:'服务',anchor:'窄背板双挂点 + 换片框',level:'新增接口件',intro:'切换活动标题、地点与简要提示，让同一空间有不同身份。',mechanism:'平面信息片插入侧开框，背板固定于同一根梯柱；机械止挡防止片材意外滑出。',parts:'片材、止挡销、紧固螺钉；也可进一步开发电子墨水替换芯。',note:'本版使用静态换片；不包含联网屏幕或实际信息发布。',mount:2,draw:'sign',power:false},
 worktop:{name:'折叠活动台',en:'WORKTOP',code:'07',w:.650,h:.100,d:.420,kind:'服务',anchor:'承力背架 × 1 + 锁定支撑臂 × 2',level:'新增承力结构',intro:'为亲子手作、材料体验和临时讲解提供短时操作面。',mechanism:'台面通过铰链连接背架；展开后支撑臂机械锁定。收拢时台面竖起贴近梯柱。',parts:'铰链、带正向锁定的支撑臂、贯穿螺钉、收拢锁扣。',note:'收拢状态也占用高度；不以摩擦或磁吸替代承力锁定。',mount:4,draw:'worktop',power:false},
 acoustic:{name:'软质界面',en:'SOFT PANEL',code:'08',w:.650,h:.700,d:.045,kind:'氛围',anchor:'轻框背板 + 挂接点 × 4',level:'新增接口件',intro:'在阅读、休息与小组活动中形成柔和的墙面界面。',mechanism:'可拆面料包覆轻框与内芯，再通过背板连接梯柱。面层独立更换，不改变挂接结构。',parts:'轻框、紧固件、包覆面料、内芯与可拆连接件。',note:'吸声效果及材料阻燃性能需实测；本版只演示布局与色彩。',mount:4,draw:'acoustic',power:false}
};

MODULES.block={name:'基础方块',en:'UNIT / 48',code:'00',kind:'展陈',draw:'frame',level:'48 mm 基础单元',anchor:'标准化背部接口（待开发）',intro:'最小 1 × 1 × 1 格单元，可相邻拼接、向外叠放，探索组合关系。',mechanism:'统一外包络为 48 mm 立方体。后接口连接适配背板，侧接口用于模块组合；内部结构仍需按 V3 重新校核。',parts:'拟用 M3 紧固件、定位销及防脱锁定件，规格待打样。',note:'叠放仅表达空间组合；悬挑连接与承载尚未验证。',mount:1};
MODULES.block.name='48 mm 基础节点';
MODULES.block.intro='1 × 1 × 1 格的连接基础；展示面和功能附件围绕节点组合。';
const extension=(name,en,code,draw,kind,mount,intro,mechanism)=>({name,en,code,draw,kind,mount,intro,mechanism,level:'节点拓展组合',anchor:`48 mm 节点 × ${mount} + 专用连接件`,parts:'定位销、M3紧固件、防脱锁定件；承力连接件规格待打样。',note:'外包络以48 mm整数格计；板材厚度按结构设计。挂接和承载需实测。'});
MODULES.rail=extension('节点横向连接','CROSSBAR','09','shelf','连接件',2,'两个节点连接一段横杆，形成连续的挂接基准。','端部48 mm节点通过定位和机械锁定连接横杆；背部适配板将载荷传回梯柱。');
MODULES.tray=extension('浅托盘组合','TRAY','10','shelf','展陈',4,'用浅托盘陈列材料样本、小型工艺与航线藏品。','四个节点连接上下背梁，两侧承托臂托住可换托盘；前沿和侧沿限制展品滑移。');
MODULES.bookrest=extension('倾斜书托组合','READING','11','frame','展陈',4,'让图录与艺术书以倾斜角度展示，可取阅后归位。','四个节点连接背架；带机械止挡的倾斜支撑托住展示板，底部挡边承托书刊。');
const sizes={rail:[15,1,1],tray:[14,3,4],bookrest:[14,8,5],block:[1,1,1],panel:[15,12,1],cabinet:[14,11,6],lamp:[4,4,4],scent:[3,5,3],shelf:[14,3,6],sign:[6,4,1],worktop:[14,10,10],acoustic:[14,15,1]};
for(const [k,m] of Object.entries(MODULES)){m.cells=sizes[k];[m.w,m.h,m.d]=m.cells.map(v=>v*PITCH);}
MODULES.panel.note='15 × 12 × 1 格为占位包络，展板本体仍为薄板；夹持厚度与结构需要打样。';
MODULES.worktop.note='预留 14 × 10 × 10 格活动包络，包含折叠路径。收拢后仍保留该空间，避免其他模块阻碍展开。';
MODULES.cabinet.note+=' 开门时额外预留前方 14 格深度的转动包络；深度总范围为 24 格。';
const item=(id,type,gx,gy,state=0,gz=0)=>({id,type,gx,gy,gz,state,color:'#3158e8',intensity:65,temperature:3200});
export const EXHIBITIONS=[
{id:'flat',name:'平面悬展',tag:'夹持 / 留白',desc:'以48 mm节点框选航线摄影与海报，灯具和展签共同组织阅读顺序。',items:[item('a','panel',3,27),item('b','panel',23,24),item('c','panel',42,27),item('d','lamp',8,45,1),item('e','lamp',28,45,1),item('f','sign',27,14)]},
{id:'shelves',name:'层架陈列',tag:'承托 / 分层',desc:'沿用两组灯具与展签，通过节点、背梁和承托臂组织高低层板、浅托盘与透明展柜。',items:[item('s1','shelf',3,25),item('s2','shelf',3,34),item('v1','cabinet',23,24),item('t1','tray',43,25),item('d','lamp',8,45,1),item('e','lamp',28,45,1),item('f','sign',27,14)]},
{id:'reading',name:'翻阅展示',tag:'倾斜 / 取阅',desc:'节点支撑倾斜书托，底部挡边承托图录；层板容纳备用书刊，横杆延续统一连接基准。',items:[item('r1','bookrest',3,24),item('r2','bookrest',23,24),item('s1','shelf',43,25),item('h1','rail',3,36),item('d','lamp',8,43,1),item('e','lamp',28,43,1),item('f','sign',27,14)]},
{id:'mixed',name:'混合策展',tag:'图像 / 实物 / 书刊',desc:'以一段航线为主题，将摄影、地方工艺与旅行图录组合成有主次的展陈。节点和附件可随主题再次使用。',items:[item('a','panel',3,27),item('v1','cabinet',23,24),item('r2','bookrest',43,25),item('t1','tray',3,16),item('d','lamp',8,45,1),item('e','lamp',28,45,1),item('f','sign',27,14)]}
];
export const PRESETS=[
{id:'gallery',name:'展陈空间',tag:'观看 / 阅读 / 发现',desc:EXHIBITIONS[0].desc,ambient:'day',items:EXHIBITIONS[0].items},
{id:'workshop',name:'共创空间',tag:'动手 / 共创',desc:'活动台预留完整折叠空间；同一套网格容纳材料、照明与软质面板。',ambient:'day',items:[item('a','worktop',3,16,1),item('b','worktop',43,16,1),item('c','shelf',23,24),item('d','sign',7,36),item('e','lamp',47,49,1),item('f','acoustic',23,34)]},
{id:'market',name:'交流市集',tag:'交换 / 相遇',desc:'展柜与层板按整数格重新组合，改变展示和取放方式。',ambient:'day',items:[item('a','cabinet',3,30),item('b','shelf',3,20),item('c','cabinet',43,30),item('d','shelf',43,20),item('e','sign',27,46),item('f','worktop',23,14,1)]},
{id:'lounge',name:'休憩空间',tag:'阅读 / 放松',desc:'降低照明亮度，以软质面板组织休憩界面；香氛默认关闭。',ambient:'night',items:[item('a','acoustic',3,24),item('b','acoustic',43,24),item('c','lamp',8,43,1),item('d','lamp',48,43,1),item('e','scent',28,9),item('f','shelf',23,19),item('g','sign',27,48)]}
];
export const clone=x=>JSON.parse(JSON.stringify(x));
export function cells(a){const c=[...MODULES[a.type].cells];if(a.type==='cabinet'&&a.state)c[2]+=14;return c;}
export function envelope(a){const c=cells(a);return {min:[a.gx,a.gy,a.gz],max:[a.gx+c[0],a.gy+c[1],a.gz+c[2]]};}
export function valid(a){return ['gx','gy','gz'].every((k,i)=>Number.isInteger(a[k])&&a[k]>=0&&a[k]+cells(a)[i]<=GRID[i]);}
export function clampPosition(a){const c=cells(a);return {...a,...Object.fromEntries(['gx','gy','gz'].map((k,i)=>[k,Math.max(0,Math.min(GRID[i]-c[i],Math.round(Number(a[k])||0)))]))};}
export function conflict(a,items){const e=envelope(a);return items.find(b=>{if(b.id===a.id)return false;const f=envelope(b);return e.min.every((v,i)=>v<f.max[i]&&e.max[i]>f.min[i]);});}
export function position(a){const c=MODULES[a.type].cells;return [ORIGIN[0]+(a.gx+c[0]/2)*PITCH,ORIGIN[1]+(a.gy+c[1]/2)*PITCH,a.gz*PITCH];}
export function findSpace(type,items,gx=0,gy=25,gz=0,source={}){const a=clampPosition({...item('new',type,gx,gy,0,gz),...source,type,id:'new',gx,gy,gz});if(!conflict(a,items))return a;for(let r=1;r<60;r++)for(let dx=-r;dx<=r;dx++)for(const dy of [-r,r]){const n={...a,gx:a.gx+dx,gy:a.gy+dy};if(valid(n)&&!conflict(n,items))return n;}for(let x=0;x<60;x++)for(let y=0;y<60;y++){const n={...a,gx:x,gy:y};if(valid(n)&&!conflict(n,items))return n;}return null;}

// Shared conceptual bill of components. Nodes belong to each assembly's envelope.
export function assembly(type){const m=MODULES[type];return {nodes:m.mount,connector:({block:'背部适配接口',panel:'夹持轴与背部适配板',rail:'横杆 × 1',shelf:'背梁 + 承托臂 × 2',tray:'背梁 + 承托臂 × 2',bookrest:'背梁 + 倾斜支撑 × 2',cabinet:'刚性背框 + 柜体连接件',lamp:'转向接头 + 独立低压线',scent:'芯盒接口 + 独立低压线',sign:'换片框接口',worktop:'背架 + 锁定支撑臂',acoustic:'轻框连接件'})[type],surface:({block:'无，基础连接单元',rail:'无，可接入兼容附件',panel:'薄型展板',shelf:'可换层板',tray:'带挡边浅托盘',bookrest:'倾斜展示板 + 挡边',cabinet:'层板 + 背板 + 透明围护',lamp:'定向灯头',scent:'可拆香氛芯盒',sign:'信息片',worktop:'折叠操作面',acoustic:'软质面板'})[type]};}
export function compareLayouts(before,after){const same=after.filter(a=>before.some(b=>b.id===a.id&&b.type===a.type));return {retained:same.length,moved:same.filter(a=>{const b=before.find(b=>b.id===a.id);return ['gx','gy','gz'].some(k=>a[k]!==b[k]);}).length,added:after.length-same.length,removed:before.length-same.length,nodes:same.reduce((n,a)=>n+MODULES[a.type].mount,0)};}
