import {revealExplanation} from './lab-interface.js?v=1';
import {THREE,createViewer,solid} from './lab-viewer.js?v=3';
import {gateState,partInfo} from './device-state.js';
const device=document.body.dataset.device,cfet=device==='cfet';
const v=createViewer({cameraPosition:cfet?[10,8,15]:[8,6.8,12],target:[0,cfet?2:.6,0]});
if(v)initialize();
function initialize(){
  const $=id=>document.getElementById(id),parts=new Map(),pickables=[],cutFaces=[],channels=[];
  const palette={gate:0xd7ad63,n:0x49b9c5,p:0xa08ad1,oxide:0xb5ded4,body:0x73668f},states=[gateState(device,false),gateState(device,true)];
  let exploded=false,high=false,moving=true,cutaway=true,labelsVisible=true,selected=null,transition=null,cameraTween=null,last=0,clock=0;
  v.controls.minDistance=3.5;v.controls.maxDistance=48;
  function part(role,polarity='n'){
    const key=(cfet?polarity+'-':'')+role;
    if(!parts.has(key)){const group=new THREE.Group();group.userData.partKey=key;v.scene.add(group);parts.set(key,{key,role,polarity,group,info:partInfo(device,role,polarity),meshes:[],anchor:new THREE.Vector3(),label:null});}
    return parts.get(key);
  }
  function box(role,size,pos,color,options={},polarity='n'){
    const p=part(role,polarity),mesh=solid(p.group,new THREE.BoxGeometry(...size),color,pos,options);
    mesh.userData.partKey=p.key;p.meshes.push(mesh);pickables.push(mesh);return mesh;
  }
  const metal={metalness:.65},clear={transparent:true,opacity:.23,depthWrite:false,metalness:0};
  box('body',[7,device==='mosfet'?.78:.55,4.4],[0,device==='mosfet'?-.585:-.7,0],palette.body);
  if(device==='mosfet'){
    box('channel',[2.8,.35,3.4],[0,-.02,0],palette.body);
    box('source',[1.6,.35,3.4],[-2.2,-.02,0],palette.n);box('drain',[1.6,.35,3.4],[2.2,-.02,0],palette.n);
    box('oxide',[2.8,.10,3.4],[0,.205,0],palette.oxide,clear);
    box('gate',[2.8,.48,3.4],[0,.50,0],palette.gate,metal);
    for(const x of [-2.2,2.2])box('contact',[1.3,.2,3.1],[x,.255,0],0xc9d8dd,metal);
    channels.push({polarity:'n',y:.14,z:0,style:'flat'});
  }else{
    box('isolation',[6.8,.28,4.2],[0,-.285,0],0x9eb7bb);
    function contacts(base,height,color,polarity){for(const [role,x] of [['source',-2.5],['drain',2.5]]){
      box(role,[1.25,height,2.3],[x,base+height/2,0],color,{},polarity);
      box('contact',[1.3,.2,2.35],[x,base+height+.1,0],0xc9d8dd,metal,polarity);
    }}
    function sheets(base,polarity){const color=palette[polarity];for(let i=0;i<3;i++){
      const y=base+i*.78;
      box('channel',[5,.18,1.8],[0,y,0],color,{},polarity);
      box('oxide',[2.05,.32,2.15],[0,y,0],palette.oxide,clear,polarity);
      for(const sign of [-1,1])box('gate',[2.1,.15,2.4],[0,y+sign*.3,0],palette.gate,metal,polarity);
      box('gate',[2.1,.45,.16],[0,y,-1.12],palette.gate,metal,polarity);
      cutFaces.push(box('gate',[2.1,.45,.16],[0,y,1.12],palette.gate,metal,polarity));
      channels.push({polarity,y,z:0,style:'sheet'});
    }box('gate',[2.1,2.5,.22],[0,base+.78,-1.4],palette.gate,metal,polarity);contacts(base-.32,2.2,color,polarity);}
    if(device==='finfet'){
      box('channel',[5.8,1.85,.42],[0,.78,0],palette.n);contacts(-.14,1.6,palette.n,'n');
      box('oxide',[2.2,1.94,.56],[0,.82,0],palette.oxide,clear);
      box('gate',[2.2,.22,.94],[0,1.91,0],palette.gate,metal);
      box('gate',[2.2,2,.2],[0,.8,-.43],palette.gate,metal);
      cutFaces.push(box('gate',[2.2,2,.2],[0,.8,.43],palette.gate,metal));
      channels.push({polarity:'n',y:.8,z:0,style:'fin'});
    }else if(cfet){sheets(.35,'p');box('middle',[6.4,.28,3.4],[0,2.75,0],palette.oxide);sheets(3.4,'n');}
    else sheets(.45,'n');
  }
  // One shared point cloud per channel; no individual particle draw calls or physics solver.
  const clouds=[];
  for(const channel of channels){
    const count=72,positions=new Float32Array(count*3),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));
    const color=channel.polarity==='p'?0xffd282:0x8de9ff;
    const cloud=new THREE.Points(g,new THREE.PointsMaterial({color,size:.12,transparent:true,opacity:.95,depthTest:true,sizeAttenuation:true}));
    cloud.renderOrder=5;v.scene.add(cloud);
    const region=solid(v.scene,new THREE.BoxGeometry(...(channel.style==='flat'?[2.8,.03,3.4]:channel.style==='fin'?[2.1,1.9,.49]:[2.1,.24,1.86])),color,[0,channel.y,channel.z],{transparent:true,opacity:.15,depthWrite:false,metalness:0,emissive:color,emissiveIntensity:.15});
    clouds.push({...channel,cloud,region,count,positions});
  }
  const bounds=new THREE.Box3(),center=new THREE.Vector3(),size=new THREE.Vector3();
  const offsets={body:-2.5,isolation:-1.4,middle:.5,source:0,drain:0,channel:1.1,oxide:3.8,gate:6.7,contact:2};
  for(const p of parts.values()){
    bounds.setFromObject(p.group);bounds.getCenter(p.anchor);
    const button=document.createElement('button');button.type='button';button.dataset.part=p.key;button.textContent=p.info.name;button.onclick=()=>select(p.key);$('part-list').append(button);
    const shortNames={source:'Source '+(p.polarity==='p'?'P+':'N+'),drain:'Drain '+(p.polarity==='p'?'P+':'N+'),channel:'Channel',gate:'Gate',oxide:'절연막',contact:'금속 접점',body:device==='mosfet'?'P형 기판':'기판',isolation:'바닥 절연',middle:'층간 절연'};
    const name=(cfet&&!['body','isolation','middle'].includes(p.role)?p.polarity+'FET · ':'')+shortNames[p.role];
    p.label=v.label(name,[p.anchor.x,p.anchor.y+.6,p.anchor.z+1]);p.label.element.classList.add('part-label');p.label.element.setAttribute('role','button');p.label.element.setAttribute('aria-label',p.info.name);p.label.element.tabIndex=0;
    p.label.element.onclick=()=>select(p.key);p.label.element.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(p.key);}};
  }
  function animateCamera(target,distance){
    const direction=v.camera.position.clone().sub(v.controls.target).normalize();
    cameraTween={start:performance.now(),from:v.camera.position.clone(),to:target.clone().addScaledVector(direction,distance),targetFrom:v.controls.target.clone(),targetTo:target.clone()};
    if(v.reduced()){v.camera.position.copy(cameraTween.to);v.controls.target.copy(target);cameraTween=null;}
    v.render();
  }
  function select(key){
    revealExplanation('structure-chapter','part-title');
    if(transition){for(const item of parts.values()){item.group.position.y=item.end;item.group.position.x=item.endX;}transition=null;}
    const p=parts.get(key);selected=key;$('part-title').textContent=p.info.name;$('part-description').textContent=p.info.description;$('part-role').textContent=p.info.job;$('part-doping').textContent=p.info.density;
    for(const other of parts.values())for(const mesh of other.meshes){mesh.material.emissive.set(other===p?0x80632b:0x000000);mesh.material.emissiveIntensity=.24;}
    document.querySelectorAll('[data-part]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.part===key)));
    bounds.setFromObject(p.group);bounds.getCenter(center);bounds.getSize(size);animateCamera(center,Math.max(7,size.length()*2.2));
  }
  function assembly(){
    exploded=!exploded;selected=null;$('explode').setAttribute('aria-pressed',String(exploded));$('explode').textContent=exploded?'다시 조립하기':'각 부위 보기';$('device-lab').dataset.exploded=String(exploded);
    $('carrier-motion').disabled=exploded;$('part-title').textContent=exploded?'살펴볼 부위를 선택하세요':'각 부위와 역할';$('part-description').textContent=exploded?'모델이나 아래 부위 이름을 누르면 확대됩니다.':'각 부위 보기로 펼치거나, 모델을 눌러 자세히 살펴보세요.';$('part-role').textContent='';$('part-doping').textContent='';
    for(const p of parts.values()){p.start=p.group.position.y;p.end=exploded?offsets[p.role]+(cfet&&p.polarity==='n'&&!['body','isolation','middle'].includes(p.role)?7.5:0):0;if(cfet&&p.role==='middle'&&exploded)p.end=6.85;p.startX=p.group.position.x;p.endX=exploded?(p.role==='source'?-1.2:p.role==='drain'?1.2:0):0;for(const mesh of p.meshes)mesh.material.emissive.set(0x000000);if(v.reduced()){p.group.position.y=p.end;p.group.position.x=p.endX;}}
    transition=v.reduced()?null:{start:performance.now()};
    animateCamera(new THREE.Vector3(0,exploded?(cfet?8.5:3):cfet?2:.6,0),exploded?(cfet?44:27):cfet?20:17);
    updateState();v.render();
  }
  function updateState(){
    const s=states[Number(high)];$('gate-low').setAttribute('aria-pressed',String(!high));$('gate-high').setAttribute('aria-pressed',String(high));
    $('gate-state').textContent=cfet?(high?'높은 입력 · nFET ON / pFET OFF':'낮은 입력 · nFET OFF / pFET ON'):(high?'Gate ON · 전자 통로 열림':'Gate OFF · 전자 통로 닫힘');
    $('gate-description').textContent=exploded?'분해 중에는 이동을 멈춥니다. 다시 조립하면 선택한 Gate 상태를 볼 수 있어요.':cfet?(high?'위쪽 nFET에서 전자가 Source → Drain으로 이동합니다. 아래쪽 정공 통로는 닫힙니다.':'아래쪽 pFET에서 정공이 Source → Drain으로 이동합니다. 위쪽 전자 통로는 닫힙니다.'):(high?'표면의 전자가 많아져 통로를 형성합니다. 전자는 왼쪽 Source에서 오른쪽 Drain으로, 관습적 전류는 반대로 흐릅니다.':'표면 전자 농도가 낮아져 연속 통로가 사라집니다. 실제 OFF 전류는 완전한 0이 아니며, 작은 누설은 이 화면에서 생략합니다.');
    $('density-n').style.opacity=String(.12+s.n.density*.88);$('density-n-value').textContent=s.n.on?'전자 많음 · ON':'전자 적음 · OFF';
    if(cfet){$('density-p').style.opacity=String(.12+s.p.density*.88);$('density-p-value').textContent=s.p.on?'정공 많음 · ON':'정공 적음 · OFF';}
    $('carrier-motion').textContent=moving?'이동 일시정지':'이동 재생';$('carrier-motion').setAttribute('aria-pressed',String(moving));
    $('motion-note').textContent=v.reduced()?'동작 줄이기 설정: 이동 대신 고정된 농도 분포를 표시해요.':'점의 개수·밝기는 상대 농도이며 실제 입자 수나 속도가 아닙니다.';
    for(const p of parts.values())if(p.role==='gate'||(device==='mosfet'&&p.role==='channel')){const conducting=s[p.polarity].on&&!exploded;for(const mesh of p.meshes){mesh.material.transparent=conducting;mesh.material.opacity=conducting?(p.role==='gate'?.25:.45):1;mesh.material.depthWrite=!conducting;}}
    v.canvas.dataset.gate=high?'high':'low';v.canvas.dataset.flow=exploded?'separated':s.n.on?'electrons':cfet?'holes':'off';v.render();
  }
  $('explode').onclick=assembly;$('gate-low').onclick=()=>{high=false;updateState();};$('gate-high').onclick=()=>{high=true;updateState();};
  $('carrier-motion').onclick=()=>{moving=!moving;updateState();};
  $('cutaway').onclick=()=>{cutaway=!cutaway;showCut();};
  function showCut(){for(const face of cutFaces)face.visible=!cutaway;$('cutaway').setAttribute('aria-pressed',String(cutaway));v.render();}
  if(device==='mosfet')$('cutaway').hidden=true;
  $('toggle-labels').onclick=()=>{labelsVisible=!labelsVisible;$('toggle-labels').setAttribute('aria-pressed',String(labelsVisible));for(const p of parts.values())p.label.element.hidden=!labelsVisible;v.render();};
  $('reset-view').addEventListener('click',()=>{selected=null;for(const p of parts.values())for(const mesh of p.meshes)mesh.material.emissive.set(0x000000);cameraTween=null;animateCamera(new THREE.Vector3(0,exploded?(cfet?8.5:3):cfet?2:.6,0),exploded?(cfet?44:27):cfet?20:17);});
  v.controls.addEventListener('start',()=>{cameraTween=null;});
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let startX=0,startY=0;
  v.canvas.addEventListener('pointerdown',e=>{startX=e.clientX;startY=e.clientY;});
  v.canvas.addEventListener('pointerup',e=>{if(Math.hypot(e.clientX-startX,e.clientY-startY)>6)return;const r=v.canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,v.camera);const hit=ray.intersectObjects(pickables).find(h=>h.object.visible);if(hit)select(hit.object.userData.partKey);});
  v.onFrame(time=>{
    let active=false;const dt=Math.min(.05,Math.max(0,(time-last)/1000));last=time;
    if(transition){const t=Math.min(1,(time-transition.start)/650),e=1-Math.pow(1-t,4);for(const p of parts.values()){p.group.position.y=p.start+(p.end-p.start)*e;p.group.position.x=p.startX+(p.endX-p.startX)*e;}if(t===1)transition=null;else active=true;}
    if(cameraTween){const t=Math.min(1,(time-cameraTween.start)/550),e=1-Math.pow(1-t,4);v.camera.position.lerpVectors(cameraTween.from,cameraTween.to,e);v.controls.target.lerpVectors(cameraTween.targetFrom,cameraTween.targetTo,e);if(t===1)cameraTween=null;else active=true;}
    const state=states[Number(high)],conducting=Boolean(state.n.on||state.p?.on),running=!exploded&&moving&&!v.reduced();if(running&&conducting){clock+=dt;active=true;}
    for(const c of clouds){const on=state[c.polarity].on,count=on?c.count:3;c.cloud.visible=!exploded;c.region.visible=!exploded;c.region.material.opacity=on?.18:.015;c.cloud.geometry.setDrawRange(0,count);for(let i=0;i<count;i++){
      const f=(i*.61803398875+(on?clock*.22:0))%1,x=-2.75+f*5.5;let y=c.y,z=c.z;
      if(c.style==='flat')z=-1.6+(i%9)/8*3.2;
      else if(c.style==='fin'){y=i%3===0?1.72:.05+(i%11)/10*1.55;z=i%3===0?-.18+(i%7)/6*.36:i%2?.24:-.24;}
      else {y+=(i%2?.105:-.105);z=-.88+(i%9)/8*1.76;}
      c.positions[i*3]=x;c.positions[i*3+1]=y;c.positions[i*3+2]=z;
    }c.cloud.geometry.attributes.position.needsUpdate=true;}
    for(const p of parts.values()){p.label.position.copy(p.anchor).add(p.group.position);p.label.position.y+=!exploded&&!selected&&p.role==='gate'?1.9:.6;p.label.position.z+=1;p.label.element.hidden=!labelsVisible||(selected&&selected!==p.key)||(!exploded&&!['gate','source','drain'].includes(p.role));}
    v.canvas.dataset.moving=String(running&&conducting);v.canvas.dataset.exploded=String(exploded);
    return active;
  });
  showCut();updateState();
}
