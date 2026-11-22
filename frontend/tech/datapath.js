import {createViewer} from './lab-viewer.js?v=6';
import {example,lesson,snapshot,instructionFields,STAGES,REGISTER_NAMES,hex} from './datapath-state.js?v=3';
import {REFERENCE,NODES,ROUTES} from './datapath-reference.js?v=1';
import {CONTROL_ROWS,pathGroups,stepRows,fieldRows,PORT_MEANINGS} from './datapath-guidance.js?v=1';
import {revealExplanation} from './lab-interface.js?v=1';

const $=id=>document.getElementById(id),svg=$('datapath-diagram'),viewport=$('datapath-view'),NS='http://www.w3.org/2000/svg';
const v=createViewer({cameraPosition:[0,4,25],target:[0,2,0]});
const colors={rs:'#006b9b',rt:'#8346aa',destination:'#a94678',result:'#087b47',immediate:'#a45909',pc:'#007c80',control:'#285fa9',instruction:'#566575'};
let state=example(),step=0,view='paths',group='data',selectedField=null,selectedSignal=null,selectedUnit=null,animation=null;
let pose={scale:.7,x:0,y:0},down=null,drag=null;
const paths=new Map(),units=new Map(),packets=[];
function element(name,attrs={},parent=svg){const n=document.createElementNS(NS,name);for(const [k,val] of Object.entries(attrs))n.setAttribute(k,String(val));parent.append(n);return n;}
function facts(target,rows){const dl=$(target);dl.replaceChildren();for(const [key,value] of rows){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=String(value);dl.append(dt,dd);}}
const defs=element('defs'),contrast=element('filter',{id:'reference-contrast','color-interpolation-filters':'sRGB'},defs),transfer=element('feComponentTransfer',{},contrast);
for(const name of ['R','G','B'])element('feFunc'+name,{type:'gamma',amplitude:1,exponent:1.7,offset:0},transfer);
element('image',{href:REFERENCE.image,x:0,y:0,width:1197,height:941,filter:'url(#reference-contrast)','aria-hidden':'true'});
// The slide's footer badge is outside the circuit.
element('rect',{x:50,y:911,width:178,height:30,fill:'#fff','aria-hidden':'true','pointer-events':'none'});
const routeLayer=element('g',{'aria-hidden':'true'}),packetLayer=element('g',{'aria-hidden':'true'});
for(const [id,points] of Object.entries(ROUTES)){
 const p=element('path',{d:points.map(([x,y],i)=>`${i?'L':'M'}${x},${y}`).join(' '),class:'route','data-route':id,visibility:'hidden'},routeLayer);paths.set(id,p);
}
for(const [id,x,y,w,h,title] of NODES){
 const r=element('rect',{x,y,width:w,height:h,class:'unit-hit',role:'button',tabindex:0,'aria-label':title+'의 입력·출력 설명','data-node':id});units.set(id,r);
 const show=()=>{selectedUnit=id;selectedField=null;selectedSignal=null;setView('steps');$('field-inspector').hidden=true;$('unit-inspector').hidden=false;$('unit-title').textContent=title;facts('unit-facts',PORT_MEANINGS[id]);revealExplanation(null,'unit-inspector');highlightSelection();};
 r.addEventListener('click',()=>{if(!down?.moved)show();});r.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show();}});
}
function allGroups(){const list=pathGroups(state),map=new Map();for(const g of list)for(const stream of g.streams)if(!map.has(stream.id))map.set(stream.id,stream);
 return [...list,{id:'all',title:'전체 경로 함께 보기',summary:'데이터·다음 PC·제어 신호를 같은 회로 위에서 비교합니다.',streams:[...map.values()],rows:[['명령어',state.assembly],['데이터',state.kind==='beq'?'두 입력 비교 + 분기 주소 계산':'입력 → 계산 → 기록'],['주소','선택된 다음 주소 → PC'],['제어','opcode → Control → MUX·읽기·쓰기 허용']]}];}
function currentGroup(){return allGroups().find(g=>g.id===group)||allGroups()[0];}
function colorFor(id){return id.startsWith('ctrl')||['opcode','funct','zero','branchSelect','aluDecode'].includes(id)?'control':['rs','readA'].includes(id)?'rs':['rt','readB','muxB'].includes(id)?'rt':['rd','rtDest','destWrite'].includes(id)?'destination':['pc4','constant4','sequential','branchBase','takeBranch','jumpPass','pcReturn'].includes(id)?'pc':['imm','extB','shift','branchOffset'].includes(id)?'immediate':'result';}
function streams(){return view==='paths'?currentGroup().streams:view==='control'?allGroups().find(g=>g.id==='control').streams:lesson(state,step).flows.map(id=>({id,start:0,end:1,color:colorFor(id)}));}
function fieldPaths(name){return name==='opcode'?['opcode']:name==='rs'?['rs']:name==='rt'?(state.kind==='lw'?['rtDest','destWrite']:['rt','readB']):name==='rd'?['rd','destWrite']:name==='funct'?['funct','aluDecode']:name==='immediate'?['imm',...(state.kind==='lw'?['extB','muxB']:['shift','branchOffset'])]:[];}
function highlightSelection(){
 const chosen=selectedField?fieldPaths(selectedField):selectedSignal?['ctrl'+selectedSignal]:[];
 for(const [id,p] of paths){p.dataset.selected=String(chosen.includes(id));if(chosen.includes(id))p.setAttribute('visibility','visible');}
 for(const [id,r] of units)r.dataset.selected=String(id===selectedUnit);
 document.querySelectorAll('[data-field]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.field===selectedField)));
 document.querySelectorAll('[data-signal]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.signal===selectedSignal)));
}
function paint(){
 for(const p of paths.values()){p.setAttribute('visibility','hidden');p.dataset.selected='false';}
 for(const stream of streams()){const p=paths.get(stream.id);if(!p)continue;p.setAttribute('visibility','visible');p.dataset.stream=stream.color;p.style.stroke=colors[stream.color];}
 highlightSelection();play();
}
function updateControls(){
 const tbody=$('control-rows');tbody.replaceChildren();
 for(const [name,bits,english,meaning,selection] of CONTROL_ROWS){
  const tr=document.createElement('tr'),th=document.createElement('th'),value=document.createElement('td'),definition=document.createElement('td'),button=document.createElement('button');th.scope='row';button.type='button';button.className='control-name';button.dataset.signal=name;button.setAttribute('aria-pressed',String(name===selectedSignal));
  button.append(document.createTextNode(name));const small=document.createElement('small');small.textContent=bits+' bit';button.append(small);th.append(button);const code=document.createElement('code');code.textContent=state.control[name];value.append(code);
  const en=document.createElement('strong'),ko=document.createElement('span'),choice=document.createElement('small');en.textContent=english;ko.textContent=meaning;choice.textContent=selection;definition.append(en,ko,choice);tr.append(th,value,definition);tbody.append(tr);
 }
 facts('derived-signals',[['Jump','0 · 그림의 추가 신호 · 최종 Mux 입력 0'],['ALU control',`${state.aluControl} · ${state.kind==='beq'?'SUB':'ADD'}`],['Zero',String(state.zero)],['PCSrc',`${state.control.Branch} AND ${state.zero} = ${Number(state.branch)}`]]);
}
function updateFacts(){
 $('step-title').textContent=`${step+1}. ${STAGES[step]}`;facts('step-facts',stepRows(state,step));
 const snap=snapshot(state,step);$('state-title').textContent=step===5?'클록 경계 이후 값':'현재 값 · 기록 전';
 const rows=[['PC',hex(snap.pc),step===5],...[8,9,10,16].map(n=>[`${REGISTER_NAMES[n]} (${n})`,n===16?hex(snap.registers[n]):snap.registers[n],step===5&&state.destination===n])];
 const tbody=$('register-values');tbody.replaceChildren();for(const [label,value,changed] of rows){const tr=document.createElement('tr');tr.dataset.changed=changed;for(const val of [label,value]){const td=document.createElement('td');td.textContent=val;tr.append(td);}tbody.append(tr);}
 const g=currentGroup();$('path-title').textContent=g.title;facts('path-facts',g.rows);updateControls();
}
function navigation(){
 const nav=$('datapath-steps');nav.replaceChildren();STAGES.forEach((title,i)=>{const b=document.createElement('button');b.type='button';b.dataset.step=i;b.innerHTML=`<small>${i+1}</small>${title}`;b.disabled=i===step;if(i===step)b.setAttribute('aria-current','step');nav.append(b);});
 const groups=allGroups(),box=$('path-groups');box.replaceChildren();for(const g of groups){const b=document.createElement('button');b.type='button';b.dataset.group=g.id;b.setAttribute('aria-pressed',String(g.id===group));b.textContent=g.title;box.append(b);}
 const groupIndex=groups.findIndex(g=>g.id===group),pathView=view==='paths';$('scene-previous').disabled=pathView?groupIndex===0:step===0;$('scene-next').disabled=pathView?groupIndex===groups.length-1:step===5;
 $('scene-step').textContent=pathView?`연결 경로 ${groupIndex+1} / ${groups.length}`:`${step+1} / 6 · ${STAGES[step]}`;
 $('scene-next').textContent=pathView?'다음 경로':'다음 단계';$('scene-replay').disabled=view==='control';
}
function bits(){
 $('current-instruction').textContent=state.assembly;$('instruction-word').textContent=hex(state.word);const strip=$('instruction-strip');strip.replaceChildren();
 for(const f of instructionFields(state)){const b=document.createElement('button');b.type='button';b.dataset.field=f.name;b.style.setProperty('--field-width',f.width);b.setAttribute('aria-label',`${f.name} [${f.high}:${f.low}] ${f.bits}`);b.innerHTML=`<span>${f.name} · ${f.width}</span><code>${f.bits}</code>`;strip.append(b);}
}
function setView(next,focus=false){
 view=next;for(const name of ['steps','control','paths']){const selected=name===view;$('view-'+name).hidden=!selected;$('tab-'+name).setAttribute('aria-selected',String(selected));$('tab-'+name).tabIndex=selected?0:-1;}if(focus)$('tab-'+next).focus();navigation();paint();svg.dataset.view=view;
}
function update(){
 document.querySelectorAll('[data-instruction]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.instruction===state.kind)));document.querySelectorAll('[data-branch]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.branch==='equal')===state.equal)));
 $('branch-options').hidden=state.kind!=='beq';updateFacts();navigation();paint();svg.dataset.case=state.kind;svg.dataset.step=step;svg.dataset.group=group;
}
function play(){
 packetLayer.replaceChildren();packets.length=0;const active=streams();
 for(const stream of active){const p=paths.get(stream.id);if(!p)continue;const dot=element('circle',{r:5.5,class:'packet',fill:colors[stream.color]},packetLayer);packets.push({...stream,path:p,length:p.getTotalLength(),dot});}
 const duration=!v||view==='control'?0:(v?.reduced()?0:view==='paths'?4200:1500);animation={start:performance.now(),duration};svg.dataset.animating=String(duration>0);place(duration?0:1);if(!duration)animation=null;v?.render();
}
function place(progress){for(const item of packets){const t=Math.max(0,Math.min(1,(progress-item.start)/(item.end-item.start))),point=item.path.getPointAtLength(item.length*t);item.dot.setAttribute('visibility',progress<item.start?'hidden':'visible');item.dot.setAttribute('cx',point.x);item.dot.setAttribute('cy',point.y);}}
if(v)v.onFrame(time=>{if(!animation)return false;const t=Math.min(1,(time-animation.start)/animation.duration);place(t);if(t===1){animation=null;svg.dataset.animating='false';}return !!animation;});
function clearInspector(){selectedField=null;selectedSignal=null;selectedUnit=null;$('field-inspector').hidden=true;$('unit-inspector').hidden=true;}
document.querySelectorAll('[data-instruction]').forEach(b=>b.addEventListener('click',()=>{state=example(b.dataset.instruction);step=0;group='data';clearInspector();bits();update();}));
document.querySelectorAll('[data-branch]').forEach(b=>b.addEventListener('click',()=>{state=example('beq',b.dataset.branch==='equal');clearInspector();update();}));
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{clearInspector();setView(b.dataset.view);}));
document.querySelector('.explanation-tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const names=['steps','control','paths'],i=names.indexOf(view),next=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;clearInspector();setView(names[next],true);});
$('datapath-steps').addEventListener('click',e=>{const b=e.target.closest('[data-step]');if(b){step=Number(b.dataset.step);clearInspector();update();}});
$('path-groups').addEventListener('click',e=>{const b=e.target.closest('[data-group]');if(b){group=b.dataset.group;clearInspector();update();}});
$('instruction-strip').addEventListener('click',e=>{const b=e.target.closest('[data-field]');if(!b)return;clearInspector();selectedField=b.dataset.field;setView('steps');facts('field-facts',fieldRows(state,selectedField));$('field-inspector').hidden=false;revealExplanation(null,'field-inspector');});
$('control-rows').addEventListener('click',e=>{const b=e.target.closest('[data-signal]');if(!b)return;selectedSignal=b.dataset.signal;selectedField=null;selectedUnit=null;paint();});
for(const id of ['scene-replay','path-replay'])$(id).addEventListener('click',play);
for(const [id,direction] of [['scene-previous',-1],['scene-next',1]])$(id).addEventListener('click',()=>{if(view==='paths'){const groups=allGroups(),index=groups.findIndex(g=>g.id===group);group=groups[Math.max(0,Math.min(groups.length-1,index+direction))].id;}else step=Math.max(0,Math.min(5,step+direction));clearInspector();update();});
function transform(){svg.style.transform=`translate(${pose.x}px,${pose.y}px) scale(${pose.scale})`;}
function reset(){const mobile=matchMedia('(max-width:800px)').matches;pose.scale=Math.max(mobile?.7:.1,Math.min(1.1,(viewport.clientWidth-24)/REFERENCE.width,(viewport.clientHeight-24)/REFERENCE.height));pose.x=Math.max(10,(viewport.clientWidth-REFERENCE.width*pose.scale)/2);pose.y=10;if(mobile)pose.y=Math.min(10,viewport.clientHeight/2-(563-REFERENCE.y)*pose.scale);transform();}
function zoom(factor,x=viewport.clientWidth/2,y=viewport.clientHeight/2){const before=pose.scale;pose.scale=Math.max(matchMedia('(max-width:800px)').matches?.7:.1,Math.min(2.5,pose.scale*factor));const ratio=pose.scale/before;pose.x=x-(x-pose.x)*ratio;pose.y=y-(y-pose.y)*ratio;transform();}
viewport.addEventListener('wheel',e=>{e.preventDefault();const r=viewport.getBoundingClientRect();zoom(e.deltaY<0?1.12:1/1.12,e.clientX-r.left,e.clientY-r.top);},{passive:false});
viewport.addEventListener('pointerdown',e=>{if(e.button!==0)return;down={x:e.clientX,y:e.clientY,moved:false};drag={x:pose.x,y:pose.y};});viewport.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;down.moved=down.moved||Math.abs(dx)+Math.abs(dy)>5;if(down.moved&&!viewport.hasPointerCapture(e.pointerId))viewport.setPointerCapture(e.pointerId);pose.x=drag.x+dx;pose.y=drag.y+dy;transform();});viewport.addEventListener('pointerup',e=>{drag=null;if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);});viewport.addEventListener('pointercancel',()=>{drag=null;});
viewport.addEventListener('keydown',e=>{if(e.target!==viewport)return;const move={ArrowLeft:[30,0],ArrowRight:[-30,0],ArrowUp:[0,30],ArrowDown:[0,-30]}[e.key];if(move){e.preventDefault();pose.x+=move[0];pose.y+=move[1];transform();}else if(['+','=','-','0'].includes(e.key)){e.preventDefault();if(e.key==='0')reset();else zoom(e.key==='-'?1/1.15:1.15);}});
$('diagram-in').addEventListener('click',()=>zoom(1.15));$('diagram-out').addEventListener('click',()=>zoom(1/1.15));$('reset-view').addEventListener('click',reset);
let oldWidth=viewport.clientWidth;new ResizeObserver(()=>{if(Math.abs(oldWidth-viewport.clientWidth)>80){oldWidth=viewport.clientWidth;reset();}}).observe(viewport);
bits();update();reset();
