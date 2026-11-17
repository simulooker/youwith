import {createEnergy} from './device-energy.js?v=1';
import {createCharges} from './device-charges.js?v=5';
import {deviceLesson} from './device-lesson.js?v=5';
import {revealExplanation} from './lab-interface.js?v=1';
import {THREE,createViewer,solid} from './lab-viewer.js?v=6';
import {partInfo} from './device-state.js';
const device=document.body.dataset.device,cfet=device==='cfet';
const v=createViewer({cameraPosition:cfet?[10,8,15]:[8,6.8,12],target:[0,cfet?2:.6,0]});
if(v)initialize();
function initialize(){
  const $=id=>document.getElementById(id),parts=new Map(),pickables=[],cutFaces=[],channels=[];
  const palette={gate:0xd7ad63,n:0x49b9c5,p:0xa08ad1,oxide:0xb5ded4,body:0x73668f};
  let exploded=false,lessonIndex=0,lessonPolarity='n',cutaway=true,labelsVisible=true,selected=null,transition=null,cameraTween=null;
  v.controls.minDistance=3.5;v.controls.maxDistance=48;
  function part(role,polarity='n'){
    const key=(cfet?polarity+'-':'')+role;
    if(!parts.has(key)){const group=new THREE.Group();group.userData.partKey=key;v.scene.add(group);parts.set(key,{key,role,polarity,group,info:partInfo(device,role,polarity),meshes:[],anchor:new THREE.Vector3(),label:null});}
    return parts.get(key);
  }
  function box(role,size,pos,color,options={},polarity='n'){
    const p=part(role,polarity),mesh=solid(p.group,new THREE.BoxGeometry(...size),color,pos,options);
    mesh.userData.partKey=p.key;mesh.userData.baseColor=mesh.material.color.clone();mesh.userData.baseOpacity=mesh.material.opacity;mesh.userData.baseTransparent=mesh.material.transparent;p.meshes.push(mesh);pickables.push(mesh);return mesh;
  }
  function chargeBox(...args){const mesh=box(...args);mesh.userData.chargeWindow=true;return mesh;}
  function frontWindow(role,size,pos,color,options={},polarity='n',cutZ=.7,openCut=false){
    const [w,h,d]=size,[x,y,z]=pos,low=z-d/2,high=z+d/2;
    box(role,[w,h,cutZ-low],[x,y,(low+cutZ)/2],color,options,polarity);
    const face=(openCut?box:chargeBox)(role,[w,h,high-cutZ],[x,y,(cutZ+high)/2],color,options,polarity);if(openCut)cutFaces.push(face);
  }
  const metal={metalness:.65},clear={transparent:true,opacity:.23,depthWrite:false,metalness:0};
  if(device==='mosfet'){
    for(const x of [-3.25,3.25])box('body',[.5,.78,4.4],[x,-.585,0],palette.body);
    frontWindow('body',[6,.78,4.4],[0,-.585,0],palette.body);
  }else box('body',[7,.55,4.4],[0,-.7,0],palette.body);
  if(device==='mosfet'){
    frontWindow('channel',[2.8,.35,3.4],[0,-.02,0],palette.body);
    box('source',[1.6,.35,3.4],[-2.2,-.02,0],palette.n);box('drain',[1.6,.35,3.4],[2.2,-.02,0],palette.n);
    box('oxide',[2.8,.10,3.4],[0,.205,0],palette.oxide,clear);
    frontWindow('gate',[2.8,.48,3.4],[0,.50,0],palette.gate,metal,'n',.7,true);
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
      chargeBox('channel',[5,.18,1.8],[0,y,0],color,{},polarity);
      box('oxide',[2.05,.32,2.15],[0,y,0],palette.oxide,clear,polarity);
      for(const sign of [-1,1])box('gate',[2.1,.15,2.4],[0,y+sign*.3,0],palette.gate,metal,polarity);
      box('gate',[2.1,.45,.16],[0,y,-1.12],palette.gate,metal,polarity);
      cutFaces.push(box('gate',[2.1,.45,.16],[0,y,1.12],palette.gate,metal,polarity));
      channels.push({polarity,y,z:0,style:'sheet'});
    }box('gate',[2.1,2.5,.22],[0,base+.78,-1.4],palette.gate,metal,polarity);contacts(base-.32,2.2,color,polarity);}
    if(device==='finfet'){
      chargeBox('channel',[5.8,1.85,.42],[0,.78,0],palette.n);contacts(-.14,1.6,palette.n,'n');
      box('oxide',[2.2,1.94,.56],[0,.82,0],palette.oxide,clear);
      box('gate',[2.2,.22,.94],[0,1.91,0],palette.gate,metal);
      box('gate',[2.2,2,.2],[0,.8,-.43],palette.gate,metal);
      cutFaces.push(box('gate',[2.2,2,.2],[0,.8,.43],palette.gate,metal));
      channels.push({polarity:'n',y:.8,z:0,style:'fin'});
    }else if(cfet){sheets(.35,'p');box('middle',[6.4,.28,3.4],[0,2.75,0],palette.oxide);sheets(3.4,'n');}
    else sheets(.45,'n');
  }
  const charges=createCharges(v,channels,device),energy=createEnergy(v);
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
    updateMaterials();v.canvas.dataset.selectedPart=key;
    document.querySelectorAll('[data-part]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.part===key)));
    bounds.setFromObject(p.group);bounds.getCenter(center);bounds.getSize(size);animateCamera(center,Math.max(7,size.length()*2.2));
  }
  function assembly(preserveView=false){
    exploded=!exploded;selected=null;$('explode').setAttribute('aria-pressed',String(exploded));$('explode').textContent=exploded?'다시 조립하기':'각 부위 보기';$('device-lab').dataset.exploded=String(exploded);
    $('part-title').textContent=exploded?'살펴볼 부위를 선택하세요':'각 부위와 역할';$('part-description').textContent=exploded?'모델이나 아래 부위 이름을 누르면 확대됩니다.':'각 부위 보기로 펼치거나, 모델을 눌러 자세히 살펴보세요.';$('part-role').textContent='';$('part-doping').textContent='';
    for(const p of parts.values()){p.start=p.group.position.y;p.end=exploded?offsets[p.role]+(cfet&&p.polarity==='n'&&!['body','isolation','middle'].includes(p.role)?7.5:0):0;if(cfet&&p.role==='middle'&&exploded)p.end=6.85;p.startX=p.group.position.x;p.endX=exploded?(p.role==='source'?-1.2:p.role==='drain'?1.2:0):0;for(const mesh of p.meshes)mesh.material.emissive.set(0x000000);if(v.reduced()){p.group.position.y=p.end;p.group.position.x=p.endX;}}
    transition=v.reduced()?null:{start:performance.now()};
    if(!preserveView)animateCamera(new THREE.Vector3(0,exploded?(cfet?8.5:3):cfet?2:.6,0),exploded?(cfet?44:27):cfet?20:17);
    updateState();v.render();
  }
  function updateMaterials(){
    for(const p of parts.values())for(const mesh of p.meshes){
      const chosen=selected===p.key,ghost=selected&&!chosen;
      mesh.material.color.copy(mesh.userData.baseColor);mesh.material.emissive.set(0x000000);
      mesh.material.opacity=mesh.userData.baseOpacity;mesh.material.transparent=mesh.userData.baseTransparent;mesh.material.depthWrite=!mesh.userData.baseTransparent;
      if(cutaway&&!exploded&&!selected&&mesh.userData.chargeWindow){mesh.material.transparent=true;mesh.material.opacity=p.role==='body'?.28:p.role==='channel'?.24:.30;mesh.material.depthWrite=false;}
      if(chosen){mesh.material.color.set(0xff75b5);mesh.material.emissive.set(0x6c173c);mesh.material.emissiveIntensity=.35;mesh.material.opacity=.95;mesh.material.transparent=false;mesh.material.depthWrite=true;}
      if(ghost){mesh.material.transparent=true;mesh.material.opacity=.52;mesh.material.depthWrite=false;}
    }
    for(const p of parts.values())p.label.element.dataset.selected=String(p.key===selected);
    document.querySelectorAll('[data-part]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.part===selected)));
  }
  function updateState(){
    const steps=deviceLesson(lessonPolarity,device),s=steps[lessonIndex];
    $('charge-title').textContent=s.title;$('charge-description').textContent=s.description;$('charge-why').textContent=s.why;$('charge-watch').textContent=s.watch;
    $('charge-voltage').textContent=`Gate ${s.gate.toFixed(2)} V · Source ${s.source.toFixed(2)} V · Drain ${s.drain.toFixed(2)} V`;
    $('charge-steps').innerHTML=steps.map((step,i)=>`<button type="button" data-charge-step="${i}" aria-label="${i+1}단계: ${step.title}" aria-current="${i===lessonIndex?'step':'false'}">${i+1}</button>`).join('');
    $('charge-steps').querySelectorAll('button').forEach(b=>b.onclick=()=>changeLesson(Number(b.dataset.chargeStep)));
    $('charge-previous').disabled=lessonIndex===0;$('charge-next').disabled=lessonIndex===steps.length-1;
    document.querySelectorAll('[data-charge-polarity]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.chargePolarity===lessonPolarity)));
    charges.set(lessonIndex,lessonPolarity);energy.set(lessonIndex,lessonPolarity);updateMaterials();v.canvas.dataset.flow=exploded?'separated':lessonIndex===3?(lessonPolarity==='p'?'holes':'electrons'):'balanced';v.render();
  }
  function changeLesson(index){cameraTween=null;lessonIndex=index;selected=null;v.canvas.dataset.selectedPart='';if(exploded)assembly(true);else updateState();}
  $('explode').onclick=()=>assembly();
  $('charge-previous').onclick=()=>changeLesson(Math.max(0,lessonIndex-1));$('charge-next').onclick=()=>changeLesson(Math.min(4,lessonIndex+1));$('charge-replay').onclick=()=>{charges.set(lessonIndex,lessonPolarity,true);energy.set(lessonIndex,lessonPolarity,true);v.render();};
  document.querySelectorAll('[data-charge-polarity]').forEach(b=>b.onclick=()=>{lessonPolarity=b.dataset.chargePolarity;changeLesson(0);});
  $('cutaway').onclick=()=>{cutaway=!cutaway;showCut();};
  function showCut(){for(const face of cutFaces)face.visible=!cutaway;$('cutaway').setAttribute('aria-pressed',String(cutaway));$('cutaway').textContent=cutaway?'관찰창 닫기':'관찰창 열기';updateMaterials();v.render();}
  $('toggle-labels').onclick=()=>{labelsVisible=!labelsVisible;$('toggle-labels').setAttribute('aria-pressed',String(labelsVisible));for(const p of parts.values())p.label.element.hidden=!labelsVisible;v.render();};
  $('reset-view').addEventListener('click',()=>{selected=null;v.canvas.dataset.selectedPart='';updateMaterials();cameraTween=null;animateCamera(new THREE.Vector3(0,exploded?(cfet?8.5:3):cfet?2:.6,0),exploded?(cfet?44:27):cfet?20:17);});
  v.controls.addEventListener('start',()=>{cameraTween=null;});
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let startX=0,startY=0;
  v.canvas.addEventListener('pointerdown',e=>{if(e.button===0){startX=e.clientX;startY=e.clientY;}});
  v.canvas.addEventListener('pointerup',e=>{if(e.button!==0)return;if(Math.hypot(e.clientX-startX,e.clientY-startY)>6)return;const r=v.canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,v.camera);const hit=ray.intersectObjects(pickables,false).find(h=>h.object.visible);if(hit)select(hit.object.userData.partKey);});
  v.onFrame(time=>{
    let active=false;
    if(transition){const t=v.reduced()?1:Math.min(1,Math.max(0,(time-transition.start)/650)),e=1-Math.pow(1-t,4);for(const p of parts.values()){p.group.position.y=p.start+(p.end-p.start)*e;p.group.position.x=p.startX+(p.endX-p.startX)*e;}if(t===1)transition=null;else active=true;}
    if(cameraTween){const t=v.reduced()?1:Math.min(1,Math.max(0,(time-cameraTween.start)/550)),e=1-Math.pow(1-t,4);v.camera.position.lerpVectors(cameraTween.from,cameraTween.to,e);v.controls.target.lerpVectors(cameraTween.targetFrom,cameraTween.targetTo,e);if(t===1)cameraTween=null;else active=true;}
    const hideTeaching=exploded||selected!==null||Boolean(transition);
    active=charges.draw(time,hideTeaching)||active;active=energy.draw(time,hideTeaching)||active;
    for(const p of parts.values()){p.label.position.copy(p.anchor).add(p.group.position);p.label.position.y+=!exploded&&!selected&&p.role==='gate'?1.9:.6;p.label.position.z+=1;p.label.element.hidden=!labelsVisible||(selected&&selected!==p.key)||(!exploded&&!['gate','source','drain'].includes(p.role));}
    v.canvas.dataset.exploded=String(exploded);
    return active;
  });
  showCut();updateState();
}
