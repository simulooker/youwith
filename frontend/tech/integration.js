import {THREE,createViewer,solid} from './lab-viewer.js?v=6';
import {INTEGRATION_CASES} from './integration-scenarios.js?v=1';
import {revealExplanation} from './lab-interface.js?v=1';

const v=createViewer({cameraPosition:[9,7.2,14],target:[0,1.1,0]});
if(v){
 const $=id=>document.getElementById(id),cyan=0x75d9df,gold=0xf0cb80,rose=0xf0a7bc,up=new THREE.Vector3(0,1,0),dummy=new THREE.Object3D();
 let caseIndex=0,step=0,angleIndex=0,root=null,labels=[],blocks=null,level=null,patch=null,normalArrow=null,traveller=null,cursor=null,animation=null,rotation=null,selected=-1,drawnCount=-1;
 const format=n=>Number(n.toFixed(5)).toLocaleString('ko-KR',{maximumFractionDigits:5});
 const data=()=>INTEGRATION_CASES[caseIndex];
 const orientation=()=>data().orientations?.[angleIndex];
 const vector=a=>new THREE.Vector3(a[0],a[2],a[1]);
 function label(text,pos){const l=v.label(text,pos);l.element.classList.add('integral-label');labels.push(l);return l;}
 function line(points,color=0x8da5ba,opacity=.7,parent=root){const g=new THREE.BufferGeometry().setFromPoints(points.map(a=>new THREE.Vector3(...a))),m=new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity});const o=new THREE.Line(g,m);parent.add(o);return o;}
 function wireCube(size,pos,color=0x8da5ba){const o=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(...size)),new THREE.LineBasicMaterial({color,transparent:true,opacity:.7}));o.position.set(...pos);root.add(o);return o;}
 function clear(){
  if(root){v.scene.remove(root);const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
  for(const l of labels)l.element.remove();for(let i=v.labels.length-1;i>=0;i--)if(labels.includes(v.labels[i]))v.labels.splice(i,1);
  labels=[];root=new THREE.Group();v.scene.add(root);blocks=null;patch=null;normalArrow=null;traveller=null;cursor=null;drawnCount=-1;rotation=null;
 }
 function field(d){
  if(d.id==='displacement'){
   line([[-4.1,0,0],[4.3,0,0]]);line([[-4.1,-1.6,0],[-4.1,3.1,0]]);
   line(d.samples.map(s=>[-4+s.t*2.6,s.value*1.25,.14]),cyan,1);
   line([[-3,-2.2,1.8],[3,-2.2,1.8]],0x97b5c7);
   traveller=solid(root,new THREE.SphereGeometry(.15,14,10),gold,[-3,-2.05,1.8],{emissive:0x5a431b});
   cursor=line([[0,-1.5,.04],[0,2.9,.04]],gold,.7);
   label('시간 t [s]',[4.3,-.35,0]);label('속도 v [m/s]',[-4.4,3.25,0]);label('물체 위치 →',[-3,-2.8,1.8]);
  }else if(d.id==='volume'){
   const points=[];for(const row of d.surface)for(let i=1;i<row.length;i++)points.push(...row[i-1],...row[i]);
   const g=new THREE.BufferGeometry(),a=[];for(let i=0;i<points.length;i+=3)a.push((points[i]-1)*2.6,points[i+2]*1.7,(points[i+1]-1)*2.6);
   for(let x=0;x<d.surface.length;x++)for(let y=1;y<d.surface.length;y++){const p=d.surface[y-1][x],q=d.surface[y][x];for(const c of [p,q])a.push((c[0]-1)*2.6,c[2]*1.7,(c[1]-1)*2.6);}
   g.setAttribute('position',new THREE.Float32BufferAttribute(a,3));root.add(new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:cyan,transparent:true,opacity:.62})));
   wireCube([5.2,.015,5.2],[0,0,0]);label('높이 f(x,y) [m]',[-2.7,3.9,-2.6]);label('바닥 면적 D · 4 m²',[0,-.5,3]);
  }else if(d.id==='mass'){
   wireCube([4,4,4],[0,1.4,0]);label('부피 V · 1 m³',[-2.6,-1,0]);label('밀도 ρ [kg/m³] · x →',[0,4.05,0]);
  }else{
   for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++){const arrow=new THREE.ArrowHelper(up,new THREE.Vector3(x*1.5,-1.7,z*1.5),5.1,cyan,.3,.16);root.add(arrow);}
   patch=new THREE.Group();patch.position.y=1;root.add(patch);normalArrow=new THREE.ArrowHelper(up,new THREE.Vector3(0,1,0),2.3,gold,.35,.18);root.add(normalArrow);
   label('흐름 F · 2 m/s',[-2.3,3.9,0]);label('面 S · 4 m²',[2.6,.8,0]);
  }
 }
 function createBlocks(d,l){
  const g=new THREE.BoxGeometry(1,1,1),m=new THREE.MeshStandardMaterial({metalness:.08,roughness:.5,transparent:d.id==='mass',opacity:d.id==='mass'?.72:.9});
  const mesh=new THREE.InstancedMesh(g,m,l.parts.length);mesh.frustumCulled=false;mesh.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,1,0),12);const color=new THREE.Color();
  for(let i=0;i<l.parts.length;i++){
   const p=l.parts[i],[x,y,z]=p.center,[dx,dy,dz]=p.size;dummy.quaternion.identity();
   if(d.id==='displacement'){dummy.position.set(-4+x*2.6,y*1.25,0);dummy.scale.set(dx*2.6*.95,Math.max(dy*1.25,.008),.13);color.set(p.value<0?0xb76585:0x287f8c);}
   else if(d.id==='volume'){dummy.position.set((x-1)*2.6,z*1.7,(y-1)*2.6);dummy.scale.set(dx*2.6*.95,dz*1.7,dy*2.6*.95);color.set(0x206e78).lerp(new THREE.Color(0xa67832),(p.value-1)/1.2);}
   else if(d.id==='mass'){dummy.position.set((x-.5)*4,z*4-.6,(y-.5)*4);dummy.scale.set(dx*4*.88,dz*4*.88,dy*4*.88);color.set(0x206e78).lerp(new THREE.Color(0xa67832),p.value-1);}
   else{dummy.position.set(x*2,0,y*2);dummy.scale.set(dx*2*.95,.055,dy*2*.95);color.set(cyan);}
   dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,color);
  }
  mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;(patch||root).add(mesh);return mesh;
 }
 function fluxQuaternion(o){return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(vector(o.basis.u),vector(o.normal),vector(o.basis.v)));}
 function build(){
  clear();const d=data();field(d);const index=d.steps[step].level;level=d.levels[index??0];
  if(index!==null||d.id==='mass'||d.id==='flux')blocks=createBlocks(d,index===null&&d.id==='flux'?{parts:[{center:[0,0,0],size:[2,2,0],value:2}]}:level);
  if(patch){patch.quaternion.copy(fluxQuaternion(orientation()));normalArrow.setDirection(vector(orientation().normal));}
  updateCopy();play();
 }
 function currentLevel(){const d=data(),i=d.steps[step].level;return i===null?null:(orientation()?.levels||d.levels)[i];}
 function exact(){return orientation()?.flux??data().exact;}
 function updateCopy(){
  const d=data(),s=d.steps[step],l=currentLevel();
  $('integral-title').textContent=s.title;$('integral-why').textContent=s.why;$('integral-watch').textContent=s.watch;
  $('integral-description').textContent=d.id==='displacement'?'속도 × 짧은 시간 = 작은 변위. 부호는 이동 방향입니다.':d.id==='volume'?'높이 × 작은 바닥 면적 = 작은 부피. 높이 아래의 공간을 더합니다.':d.id==='mass'?'밀도 × 작은 부피 = 작은 질량. 색은 밀도이며 높이가 아닙니다.':'면에 수직인 유속 × 작은 면적 = 그 면을 통과하는 유량.';
  $('integral-steps').innerHTML=d.steps.map((s,i)=>`<button type="button" data-integral-step="${i}" aria-current="${step===i?'step':'false'}" ${step===i?'disabled':''} aria-label="${i+1}단계: ${s.title}">${i+1}</button>`).join('');
  document.querySelectorAll('[data-integral-step]').forEach(b=>b.onclick=()=>{step=Number(b.dataset.integralStep);selected=-1;build();});
  document.querySelectorAll('[data-integral-case]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.integralCase===d.id)));
  $('integral-previous').disabled=step===0;$('integral-next').disabled=step===3;
  $('flux-options').hidden=d.id!=='flux';document.querySelectorAll('[data-flux-angle]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.fluxAngle)===(orientation()?.degrees??0))));
  $('integral-formula').innerHTML=formula(d.id);$('integral-local').textContent=d.localFormula;
  $('integral-exact').textContent=format(exact())+' '+d.unit;$('integral-count').textContent=l?l.parts.length+'조각':d.id==='mass'?'밀도 분포':'나누기 전';$('integral-sum').textContent=l?format(l.sum)+' '+d.unit:'—';
  $('integral-sampling').textContent=d.id==='flux'?'균일한 흐름·평면이므로 분할 수와 관계없이 정확합니다. 법선 방향에 따라 부호가 바뀝니다.':'각 구간·셀의 왼쪽(아래쪽) 값을 쓰는 근사합입니다. 더 작게 나눈 극한이 정확한 적분값입니다.';
  $('integral-distance').hidden=d.id!=='displacement';$('integral-distance').textContent='같은 운동: 변위 1.5 m · 총 이동 거리 2.5 m';
  $('integral-reference').href=d.source;$('flux-motion').textContent=rotation?'면을 회전하는 중 · 수치는 선택한 각도의 결과입니다.':'수치는 선택한 면 방향의 결과입니다.';showPiece(selected<0?0:selected);
  v.canvas.dataset.integralAnimating=String(Boolean(animation||rotation));Object.assign(v.canvas.dataset,{integralCase:d.id,integralStep:String(step),integralAngle:String(orientation()?.degrees??0)});
 }
 function showPiece(index){const d=data(),l=currentLevel();if(!l){$('integral-piece').textContent='다음 단계에서 작은 조각을 살펴보세요.';return;}const p=l.parts[index]||l.parts[0];$('integral-piece').textContent=`조각 ${index+1}: ${format(p.value)} ${d.valueUnit} × ${format(p.measure)} ${d.measureUnit} = ${format(p.contribution)} ${d.unit}`;}
 function play(){const d=data();animation=(d.id==='displacement'||step>0)&&!v.reduced()?{start:performance.now(),duration:step===3||step===0?1900:750}:null;drawnCount=-1;v.canvas.dataset.integralAnimating=String(Boolean(animation||rotation));v.render();}
 document.querySelectorAll('[data-integral-case]').forEach(b=>b.onclick=()=>{caseIndex=INTEGRATION_CASES.findIndex(d=>d.id===b.dataset.integralCase);step=0;angleIndex=0;selected=-1;build();});
 $('integral-previous').onclick=()=>{step=Math.max(0,step-1);selected=-1;build();};$('integral-next').onclick=()=>{step=Math.min(3,step+1);selected=-1;build();};$('integral-replay').onclick=play;
 document.querySelectorAll('[data-flux-angle]').forEach(b=>b.onclick=()=>{angleIndex=data().orientations.findIndex(o=>o.degrees===Number(b.dataset.fluxAngle));rotation={start:performance.now(),from:patch.quaternion.clone(),to:fluxQuaternion(orientation())};if(v.reduced()){patch.quaternion.copy(rotation.to);normalArrow.setDirection(vector(orientation().normal));rotation=null;}updateCopy();v.render();});
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=[0,0];v.canvas.addEventListener('pointerdown',e=>{if(e.button===0)down=[e.clientX,e.clientY];});
 v.canvas.addEventListener('pointerup',e=>{if(e.button!==0||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6||!blocks||!currentLevel())return;const r=v.canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,v.camera);const hit=ray.intersectObject(blocks,false)[0];if(hit){selected=hit.instanceId;showPiece(selected);revealExplanation('integral-chapter','integral-piece');}});
 v.onFrame(time=>{
  const d=data(),t=animation?(v.reduced()?1:Math.min(1,Math.max(0,(time-animation.start)/animation.duration))):1;
  let count=blocks?.instanceMatrix.count||0;
  if(blocks){if(step===3)count=Math.floor(count*t);else if(animation&&step>0&&d.id!=='displacement'&&d.id!=='volume')count=Math.ceil(count*t);blocks.count=count;if(animation&&step<3&&(d.id==='displacement'||d.id==='volume'))blocks.scale.y=Math.max(.001,1-Math.pow(1-t,3));else blocks.scale.y=1;}
  if(d.id==='displacement'&&traveller){const progress=step===0||step===3?t:1,u=progress*(d.samples.length-1),i=Math.min(d.samples.length-2,Math.floor(u)),f=u-i,a=d.samples[i],b=d.samples[i+1];traveller.position.x=-3+(a.accumulated+(b.accumulated-a.accumulated)*f)*2.4;cursor.position.x=-4+(a.t+(b.t-a.t)*f)*2.6;}
  if(step===3&&count!==drawnCount){const l=currentLevel();$('integral-sum').textContent=format(count?l.parts[Math.min(count,l.parts.length)-1].cumulative:0)+' '+d.unit;$('integral-count').textContent=`${count} / ${l.parts.length}조각`;drawnCount=count;}
  if(rotation){const p=v.reduced()?1:Math.min(1,Math.max(0,(time-rotation.start)/650)),e=1-Math.pow(1-p,3);patch.quaternion.slerpQuaternions(rotation.from,rotation.to,e);normalArrow.setDirection(up.clone().applyQuaternion(patch.quaternion));if(p===1){rotation=null;$('flux-motion').textContent='수치는 선택한 면 방향의 결과입니다.';}}
  if(animation&&t===1)animation=null;v.canvas.dataset.integralAnimating=String(Boolean(animation||rotation));return Boolean(animation||rotation);
 });
 build();
}

function formula(id){
 const mi=s=>`<mi>${s}</mi>`,mn=s=>`<mn>${s}</mn>`,mo=s=>`<mo stretchy="false">${s}</mo>`,row=s=>`<mrow>${s}</mrow>`,sub=(a,b)=>`<msub>${a}${b}</msub>`,range=(s,a,b)=>`<msubsup><mo>${s}</mo>${row(a)}${row(b)}</msubsup>`;
 let text;
 if(id==='displacement')text=mi('Δx')+mo('=')+range('∫',mn(0),mn(3))+mo('(')+mn(2)+mo('−')+mi('t')+mo(')')+mi('dt');
 else if(id==='volume')text=mi('V')+mo('=')+sub(mo('∬'),mi('D'))+mi('f')+mo('(')+mi('x')+mo(',')+mi('y')+mo(')')+mi('dA');
 else if(id==='mass')text=mi('M')+mo('=')+sub(mo('∭'),mi('V'))+mi('ρ')+mo('(')+mi('x')+mo(',')+mi('y')+mo(',')+mi('z')+mo(')')+mi('dV');
 else text=mi('Q')+mo('=')+sub(mo('∬'),mi('S'))+row(`<mover>${mi('F')}<mo>→</mo></mover>`+mo('·')+`<mover>${mi('n')}<mo>^</mo></mover>`)+mi('dS');
 return `<math xmlns="http://www.w3.org/1998/Math/MathML" display="block"><mrow>${text}</mrow></math>`;
}
