import {THREE,createViewer,solid} from './lab-viewer.js?v=6';
import {COMPONENTS} from './signal-components.js?v=1';
import {signalFormula} from './signal-formulas.js?v=2';
import {componentFormula,sumFormula} from './component-formulas.js?v=2';
import {writeSignalPositions,signalButtonState} from './signal-motion.js?v=1';
import {revealExplanation} from './lab-interface.js?v=1';

const v=createViewer({cameraPosition:[0,2.8,28],target:[0,0,0]});
if(v){
 const $=id=>document.getElementById(id),colors=[0x73dedb,0xc5a2ff,0xf4c874,0xf29cbc],gold=new THREE.Color(0xf1ce86),muted=new THREE.Color(0x536777);
 const descriptions={
  fs:['FS · 주기 연속 신호의 푸리에 급수','쪼개서 계수를 찾고, 더해서 복원합니다.','반복 파형의 주파수 구성을 볼 때 씁니다.'],
  ft:['FT · 비주기 연속 신호의 푸리에 변환','쪼개서 성분을 찾고, 적분해 복원합니다.','펄스에 섞인 주파수를 볼 때 씁니다.'],
  dtfs:['DTFS · 주기 이산 신호의 푸리에 급수','쪼개서 계수를 찾고, 더해서 복원합니다.','반복 수열의 주파수 구성을 볼 때 씁니다.'],
  dtft:['DTFT · 이산 신호의 푸리에 변환','쪼개서 성분을 찾고, 적분해 복원합니다.','표본 신호의 주파수 특성을 볼 때 씁니다.']
 };
 let family=COMPONENTS.findIndex(d=>d.id==='fs'),spread=0,animation=null,pending=null,selected=-1,root=null,views=[],labels=[],mergedLabel,drawnSpread=NaN,drawnSelected=-1;
 const halfWidth=5.6,amplitude=1.25;
 function xyz(d,values){const a=new Float32Array(values.length*3),range=d.time.at(-1)-d.time[0];for(let i=0;i<values.length;i++){a[i*3]=-halfWidth+(d.time[i]-d.time[0])/range*halfWidth*2;a[i*3+1]=values[i]*amplitude;}return a;}
 function axis(color){const geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-halfWidth,0,0),new THREE.Vector3(halfWidth,0,0)]);const object=new THREE.Line(geometry,new THREE.LineBasicMaterial({color,transparent:true,opacity:.3}));root.add(object);return object;}
 function wave(positions,discrete,color,index){
  const geometry=new THREE.BufferGeometry(),material=discrete?new THREE.PointsMaterial({color,size:.13,toneMapped:false}):new THREE.MeshBasicMaterial({color,toneMapped:false});
  let object,stems=null;
  if(discrete){geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));object=new THREE.Points(geometry,material);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(positions.length*2),3).setUsage(THREE.DynamicDrawUsage));stems=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color,toneMapped:false}));root.add(stems);}
  else{
   // Four-sided tubes keep their buffers throughout the morph; no geometry is rebuilt per frame.
   const count=positions.length/3,vertices=new Float32Array(count*4*3),indices=[];
   for(let i=0;i<count-1;i++)for(let r=0;r<4;r++){const a=i*4+r,b=i*4+(r+1)%4,c=b+4,e=a+4;indices.push(a,b,c,a,c,e);}
   geometry.setAttribute('position',new THREE.BufferAttribute(vertices,3).setUsage(THREE.DynamicDrawUsage));geometry.setIndex(indices);object=new THREE.Mesh(geometry,material);
  }
  object.frustumCulled=false;object.userData.signalComponent=index;object.userData.centers=positions;root.add(object);return {object,material,stems,positions};
 }
 function updateWave(view){
  const a=view.positions,g=view.object.geometry;
  if(view.stems){const stems=view.stems.geometry.attributes.position.array;for(let i=0;i<a.length;i+=3){const p=i*2;stems[p]=stems[p+3]=a[i];stems[p+1]=view.offset*spread;stems[p+4]=a[i+1];stems[p+2]=stems[p+5]=a[i+2];}view.stems.geometry.attributes.position.needsUpdate=true;}
  else{const vertices=g.attributes.position.array,r=.026;for(let i=0;i<a.length;i+=3){const p=i*4;for(let j=0;j<4;j++){const k=p+j*3;vertices[k]=a[i];vertices[k+1]=a[i+1]+(j===0?r:j===2?-r:0);vertices[k+2]=a[i+2]+(j===1?r:j===3?-r:0);}}}
  g.attributes.position.needsUpdate=true;
 }
 function updateCopy(){
  const d=COMPONENTS[family],target=animation?.to,split=target===1||(target===undefined&&spread===1),state=signalButtonState(spread,target??null);
  $('signal-description').innerHTML=descriptions[d.id].map(line=>`<span>${line}</span>`).join('');
  $('signal-state').textContent=animation?(target===1?'파형을 주파수 성분으로 나누는 중':'성분을 한 파형으로 결합하는 중'):spread===1?'주파수별 성분':d.exact?'합쳐진 원래 신호':'합쳐진 신호 · 유한 대역 근사';
  $('signal-split').disabled=state.splitDisabled;$('signal-join').disabled=state.joinDisabled;$('signal-actions').setAttribute('aria-busy',String(Boolean(animation)));
  document.querySelectorAll('[data-signal-family]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.signalFamily===d.id)));
  $('analysis-row').dataset.active=String(split);$('synthesis-row').dataset.active=String(!split);
  $('signal-example').textContent=`${d.probe.label}: ${d.probe.values.map((x,i)=>(x<0?'− ':i?'+ ':'')+Math.abs(x).toFixed(4)).join(' ')} = ${d.probe.sum.toFixed(4)}`;
  $('signal-analysis-formula').innerHTML=signalFormula(d.id,false);$('signal-formula').innerHTML=signalFormula(d.id,true);$('signal-sum-equation').innerHTML=sumFormula(d);
  $('formula-symbols').textContent=d.id==='fs'?'ω₀ = 2π/T₀ · T₀는 한 주기, cₖ는 k번째 계수입니다.':d.id==='dtfs'?'N은 한 주기의 표본 수, cₖ는 k번째 계수입니다.':d.id==='ft'?'화면은 ±6π 대역의 근사입니다. 연속 주파수를 네 구간으로 묶었습니다.':'주파수 한 주기 −π…π를 네 구간으로 묶었습니다.';
  $('formula-meaning').textContent=d.parts[0].kind==='band'?'각 곡선은 주파수 한 개가 아니라 연속 주파수 구간의 기여입니다. 구간별 적분을 더하면 전체 적분이 됩니다.':'각 실수 파형은 양·음 주파수의 켤레 성분을 묶은 것입니다. 같은 시간의 값을 더하면 전체 신호가 됩니다.';
  Object.assign(v.canvas.dataset,{signalFamily:d.id,signalLayout:animation?(target===1?'splitting':'joining'):spread===1?'split':'joined',animationRunning:String(Boolean(animation)),signalOperation:split?'analysis':'synthesis'});
 }
 function select(index,open=true){selected=selected===index?-1:index;document.querySelectorAll('[data-component]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.component)===selected)));if(open)revealExplanation('components-chapter','component-'+index);v.render();}
 function build(){
  if(root){v.scene.remove(root);root.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
  for(const label of labels)label.element.remove();for(let i=v.labels.length-1;i>=0;i--)if(labels.includes(v.labels[i]))v.labels.splice(i,1);
  labels=[];views=[];root=new THREE.Group();v.scene.add(root);drawnSpread=NaN;
  const d=COMPONENTS[family],merged=xyz(d,d.sum),mergedTop=Math.max(...d.sum)*amplitude;
  mergedLabel=v.label(d.exact?'원래 신호':'근사 신호',[-7.2,mergedTop+.6,0]);mergedLabel.element.classList.add('component-label','merged-label');mergedLabel.width=mergedLabel.element.offsetWidth;labels.push(mergedLabel);
  d.parts.forEach((p,i)=>{
   const positions=new Float32Array(merged),component=xyz(d,p.values),view=wave(positions,d.discrete,colors[i],i),offset=(d.parts.length/2-.5-i)*(d.parts.length===2?4.2:2.8),depth=(i-(d.parts.length-1)/2)*.4;
   const baseline=axis(0x7895a8),dot=solid(root,new THREE.SphereGeometry(.07,8,6),colors[i],[0,0,0],{emissive:colors[i],emissiveIntensity:.25});
   const label=v.label((p.kind==='band'?'대역 ':'성분 ')+(i+1),[-7.2,0,0]);label.element.classList.add('component-label');label.element.style.borderColor='#'+colors[i].toString(16);label.element.setAttribute('role','button');label.element.tabIndex=0;label.element.onclick=()=>select(i);label.element.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(i);}};label.width=label.element.offsetWidth;labels.push(label);
   views.push({...view,component,merged,color:new THREE.Color(colors[i]),offset,depth,axis:baseline,dot,label,top:Math.max(...p.values)*amplitude,mergedTop});
  });
  $('component-formulas').innerHTML=d.parts.map((p,i)=>`<section id="component-${i}" class="component-entry"><button type="button" data-component="${i}" aria-pressed="false"><i style="background:#${colors[i].toString(16)}"></i><span>${p.label}</span></button><div class="signal-formula">${componentFormula(d,p,i)}</div><p>${p.note}</p></section>`).join('');
  document.querySelectorAll('[data-component]').forEach(b=>b.onclick=()=>select(Number(b.dataset.component),false));updateCopy();v.render();
 }
 function animate(to){
  const state=signalButtonState(spread,animation?.to??null);if(to===1?state.splitDisabled:state.joinDisabled)return;
  animation={from:spread,to,start:performance.now()};
  if(v.reduced()){spread=to;animation=null;if(pending!==null){family=pending;pending=null;spread=1;selected=-1;build();}}
  updateCopy();v.render();
 }
 function choose(id){
  const index=COMPONENTS.findIndex(d=>d.id===id);selected=-1;pending=null;document.querySelectorAll('[data-component]').forEach(b=>b.setAttribute('aria-pressed','false'));
  if(index!==family){if(spread>0&&!v.reduced()){pending=index;animate(0);}else{family=index;spread=0;animation=null;build();animate(1);}}
  else animate(1);
  v.render();
 }
 document.querySelectorAll('[data-signal-family]').forEach(b=>b.onclick=()=>choose(b.dataset.signalFamily));
 $('signal-split').onclick=()=>{pending=null;animate(1);};$('signal-join').onclick=()=>{pending=null;animate(0);};
 v.onFrame(time=>{
  if(animation){const t=v.reduced()?1:Math.min(1,Math.max(0,(time-animation.start)/800)),e=1-Math.pow(1-t,3);spread=animation.from+(animation.to-animation.from)*e;if(t===1){spread=animation.to;animation=null;if(pending!==null){family=pending;pending=null;spread=0;selected=-1;build();animate(1);}else updateCopy();}}
  if(spread!==drawnSpread||selected!==drawnSelected){
   const d=COMPONENTS[family];
   for(let i=0;i<views.length;i++){
    const view=views[i];writeSignalPositions(view.positions,view.merged,view.component,spread,view.offset,view.depth);updateWave(view);
    view.material.color.copy(gold).lerp(view.color,spread);if(selected>=0&&selected!==i)view.material.color.lerp(muted,.7*spread);if(view.stems)view.stems.material.color.copy(view.material.color);
    view.axis.position.set(0,view.offset*spread,view.depth*spread);const p=d.probe.index*3;view.dot.position.fromArray(view.positions,p);view.dot.material.color.copy(view.material.color);
    view.label.position.set(-7.2,view.mergedTop+(view.top-view.mergedTop+view.offset)*spread+.6,view.depth*spread);view.label.element.hidden=spread<.01;
   }
   mergedLabel.element.hidden=spread>=.01;v.canvas.dataset.signalSpread=spread.toFixed(3);drawnSpread=spread;drawnSelected=selected;
  }
  return Boolean(animation);
 });
 build();
}
