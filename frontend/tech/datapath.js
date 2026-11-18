import {createViewer} from './lab-viewer.js?v=6';
import {example,lesson,snapshot,instructionFields,fieldMeaning,STAGES,SIGNALS,REGISTER_NAMES,hex,binary} from './datapath-state.js?v=1';
import {revealExplanation} from './lab-interface.js?v=1';

const $=id=>document.getElementById(id),svg=$('datapath-diagram'),viewport=$('datapath-view'),NS='http://www.w3.org/2000/svg';
const v=createViewer({cameraPosition:[0,4,25],target:[0,2,0]});
// A readable schematic sits in the same 3D grid as the other Tech lessons.
// It is not a pipeline: animation only slows down combinational signal propagation.
const NODES=[
 ['pc',50,330,70,100,'PC','명령어 주소를 저장하는 32비트 상태 레지스터입니다. 클록 경계에서 선택된 다음 주소로 바뀝니다.'],
 ['imem',165,315,145,130,'Instruction|Memory','PC가 지정한 주소에서 32비트 명령어를 읽습니다. 데이터 메모리와 분리한 단일 사이클 교재 모델입니다. 별도의 Instruction Register(IR)를 두지 않습니다.'],
 ['regs',420,300,165,170,'Register|File','32개 × 32비트 레지스터입니다. rs와 rt의 5비트 번호로 두 값을 동시에 읽습니다. RegWrite=1이면 선택한 5비트 목적지 번호에 32비트 Write data를 기록합니다. $zero는 항상 0입니다.'],
 ['alusrc',655,420,50,80,'MUX','ALUSrc=0은 Read data 2, 1은 부호 확장 immediate를 ALU B로 선택합니다. MUX는 데이터를 계산하거나 저장하지 않는 선택 회로입니다.'],
 ['alu',755,315,105,135,'ALU','ADD는 두 32비트 값을 더하고 SUB는 뺍니다. 결과가 0일 때 Zero=1입니다. lw에서는 주소를, add에서는 합을, beq에서는 비교 결과를 계산합니다.'],
 ['mem',930,315,145,135,'Data|Memory','ALU 결과를 바이트 주소로 사용합니다. lw는 MemRead=1로 32비트 값을 읽습니다. 이 예제의 0x0000200C에는 42가 저장되어 있습니다. 세 명령어 모두 MemWrite=0입니다.'],
 ['wb',1125,315,50,110,'MUX','MemtoReg=0은 ALU 결과, 1은 Data Memory 읽기값을 Write data로 선택합니다. beq는 RegWrite=0이므로 선택값은 결과에 영향을 주지 않습니다.'],
 ['control',410,75,165,100,'Main|Control','Instruction[31:26]의 opcode 6비트를 해독하여 MUX 선택 신호와 RegWrite, MemRead, MemWrite, Branch, ALUOp를 만듭니다. Zero는 여기서 생성하지 않습니다.'],
 ['plus4',170,70,120,70,'PC + 4','32비트 명령어는 4바이트이므로 다음 순차 주소는 PC+4입니다. ALU와 별도의 가산기라 다른 계산과 병렬로 동작합니다.'],
 ['target',800,70,125,70,'Branch +','PC+4 + (SignExt(immediate) << 2)를 계산하는 별도의 가산기입니다. 비교용 ALU의 뺄셈 결과를 주소로 사용하지 않습니다.'],
 ['branch',1000,175,100,60,'AND','PCSrc = Branch AND Zero. 분기 명령이면서 비교 결과가 0일 때만 목적지를 선택합니다.'],
 ['nextpc',1130,75,55,75,'MUX','PCSrc=0이면 PC+4, 1이면 분기 목적지를 다음 PC로 선택합니다.'],
 ['regdst',350,530,65,85,'MUX','RegDst=0은 rt(20:16), 1은 rd(15:11)를 5비트 Write register 번호로 선택합니다. add는 rd, lw는 rt, beq는 기록하지 않습니다.'],
 ['extend',440,640,145,65,'Sign extend','16비트 signed immediate의 부호 비트를 상위 16비트로 복제해 32비트로 만듭니다. 음수는 2의 보수 표현을 유지합니다.'],
 ['shift',660,640,80,65,'<< 2','분기 immediate는 명령어 개수 단위이므로 2비트 시프트해 바이트 차이로 바꿉니다. lw의 byte offset은 이 회로를 거치지 않습니다.'],
 ['aluctrl',755,540,110,65,'ALU|Decoder','Main Control의 ALUOp를 해독합니다. 00은 ADD, 01은 SUB, 10은 R-format의 funct를 함께 해독합니다. 이 모델의 ALUControl은 ADD=0010, SUB=0110인 4비트 교재 인코딩입니다.']
];
const ROUTES={
 fetch:[[120,380],[165,380]],pc4:[[85,330],[85,105],[170,105]],
 opcode:[[280,315],[280,260],[380,260],[380,125],[410,125]],rs:[[310,350],[420,350]],rt:[[310,410],[375,410],[375,450],[420,450]],rd:[[310,420],[330,420],[330,555],[350,555]],rtDest:[[375,450],[375,490],[390,490],[390,530]],
 imm:[[310,430],[320,430],[320,675],[440,675]],funct:[[310,445],[310,755],[810,755],[810,605]],
 readA:[[585,350],[755,350]],readB:[[585,435],[655,435]],extB:[[585,675],[625,675],[625,480],[655,480]],muxB:[[705,460],[730,460],[730,420],[755,420]],
 address:[[860,360],[930,360]],memoryOut:[[1075,385],[1125,385]],loadWB:[[1125,385],[1150,385],[1175,380]],
 aluBypass:[[860,400],[895,400],[895,510],[1100,510],[1100,340],[1125,340]],aluWB:[[1125,340],[1150,340],[1175,380]],
 writeback:[[1175,380],[1210,380],[1210,720],[460,720],[460,470]],destWrite:[[415,570],[435,570],[435,470]],
 shift:[[585,675],[660,675]],branchOffset:[[740,675],[900,675],[900,150],[860,140]],branchBase:[[290,105],[800,105]],
 zero:[[860,420],[880,420],[880,210],[1000,210]],branchSelect:[[1100,210],[1150,210],[1150,150]],takeBranch:[[925,105],[1130,105]],
 sequential:[[290,105],[310,105],[310,40],[1160,40],[1160,75]],pcReturn:[[1185,110],[1235,110],[1235,780],[85,780],[85,430]],
 ctrlRegDst:[[430,175],[430,210],[350,210],[350,520],[380,530]],ctrlALUSrc:[[450,175],[450,235],[690,235],[690,420]],ctrlMemtoReg:[[510,175],[510,260],[1150,260],[1150,315]],
 ctrlRegWrite:[[470,175],[470,260],[480,260],[480,300]],ctrlMemRead:[[530,175],[530,220],[960,220],[960,315]],ctrlMemWrite:[[550,175],[550,240],[1020,240],[1020,315]],
 ctrlBranch:[[575,125],[1050,125],[1050,175]],ctrlALUOp:[[575,150],[600,150],[600,570],[755,570]],aluDecode:[[810,540],[810,450]]
};
const PATH_LABELS={fetch:'PC → Instruction Memory',pc4:'PC → +4',opcode:'opcode → Main Control',rs:'rs → Read register 1',rt:'rt → Read register 2',rd:'rd → RegDst MUX',rtDest:'rt → RegDst MUX',imm:'immediate → Sign extend',funct:'funct → ALU Decoder',readA:'Read data 1 → ALU A',readB:'Read data 2 → ALUSrc MUX',extB:'SignExt → ALUSrc MUX',muxB:'ALUSrc MUX → ALU B',address:'ALU → Memory address',memoryOut:'Memory data → MemtoReg MUX',loadWB:'MemtoReg=1 → Write data',aluBypass:'ALU result → MemtoReg MUX',aluWB:'MemtoReg=0 → Write data',writeback:'Write data → Register File',destWrite:'Write register 번호 → Register File',shift:'SignExt → <<2',branchOffset:'<<2 → Branch adder',branchBase:'PC+4 → Branch adder',zero:'ALU Zero → AND',branchSelect:'Branch AND Zero → PCSrc',takeBranch:'Branch target → Next PC',sequential:'PC+4 → Next PC',pcReturn:'Next PC → PC',aluDecode:'ALUControl → ALU'};
PATH_LABELS.destWrite='Write register 번호 → Register File';
let state=example(),step=0,selectedField=null,selectedSignal=null,selectedNode=null,animation=null,pose={scale:1,x:0,y:0},drag=null,down=null;
const paths=new Map(),chips=new Map(),packets=[];
function element(name,attributes={},parent=svg){const n=document.createElementNS(NS,name);for(const [key,value] of Object.entries(attributes))n.setAttribute(key,String(value));parent.append(n);return n;}
const defs=element('defs'),marker=element('marker',{id:'data-arrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:5,markerHeight:5,orient:'auto-start-reverse'},defs);element('path',{d:'M 0 1 L 9 5 L 0 9 Z',fill:'#85b5c5'},marker);
const wireLayer=element('g',{'aria-hidden':'true'});
for(const [id,points] of Object.entries(ROUTES)){
 const p=element('path',{d:points.map(([x,y],i)=>`${i?'L':'M'}${x},${y}`).join(' '),class:'wire'+(id.startsWith('ctrl')||['aluDecode','zero','branchSelect'].includes(id)?' control-wire':''),'marker-end':'url(#data-arrow)','data-route':id},wireLayer);paths.set(id,p);
}
for(const [id,x,y,w,h,name,description] of NODES){
 const g=element('g',{class:'chip',role:'button',tabindex:0,'aria-label':name.replace('|',' ')+' 역할 보기','data-node':id});chips.set(id,g);
 element('rect',{x:x+5,y:y+6,width:w,height:h,rx:8,class:'depth'},g);element('rect',{x,y,width:w,height:h,rx:8,class:'face'},g);
 const lines=name.split('|');lines.forEach((text,i)=>{const t=element('text',{x:x+w/2,y:y+h/2-((lines.length-1)*13)+i*26-8,'text-anchor':'middle',class:'name'},g);t.textContent=text;});
 const value=element('text',{x:x+w/2,y:y+h-14,'text-anchor':'middle',class:'value'},g);value.dataset.nodeValue=id;
 const show=()=>{selectedNode=id;selectedField=null;selectedSignal=null;highlight();$('part-name').textContent=name.replace('|',' ');$('part-description').textContent=description;revealExplanation('part-chapter','part-name');};g.addEventListener('click',()=>{if(!down?.moved)show();});g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show();}});
}
for(const [text,x,y] of [['rs · 5',355,335],['rt · 5',375,395],['32',625,335],['32',886,346],['RegDst',380,635],['ALUSrc',680,518],['MemtoReg',1149,448],['PCSrc',1158,170],['부호 확장 · 16 → 32',509,733],['PC+4 + (SignExt(imm) << 2)',840,20]]){const t=element('text',{x,y,'text-anchor':'middle',class:'port-label','aria-hidden':'true'});t.textContent=text;}
const packetLayer=element('g',{'aria-hidden':'true'});
function values(){const e=state,f=e.fields;return {fetch:`주소 ${hex(e.pc)} → 명령어 ${hex(e.word)} (32비트)`,pc4:`${hex(e.pc)} + 4 → ${hex(e.pc4)}`,opcode:binary(f.opcode,6),rs:`${binary(f.rs,5)} · 번호 ${f.rs}`,rt:`${binary(f.rt,5)} · 번호 ${f.rt}`,rd:`${binary(f.rd,5)} · 번호 ${f.rd}`,rtDest:`${binary(f.rt,5)} · 번호 ${f.rt}`,imm:`${binary(f.immediate,16)} → ${hex(f.immediate)}`,funct:binary(f.funct,6),readA:`${REGISTER_NAMES[f.rs]} = ${e.kind==='lw'?hex(e.a):e.a}`,readB:`${REGISTER_NAMES[f.rt]} = ${e.registers[f.rt]}`,extB:`${f.immediate} · ${hex(f.immediate)}`,muxB:`ALUSrc=${e.control.ALUSrc} → ${e.b}`,address:hex(e.alu),memoryOut:'42 (32비트)',loadWB:'42',aluBypass:String(e.alu),aluWB:String(e.alu),writeback:`${e.value} → $t0`,destWrite:'01000 → 번호 8 ($t0)',shift:`${hex(f.immediate)} << 2 → ${e.shifted}`,branchOffset:`${e.shifted}바이트`,branchBase:hex(e.pc4),zero:String(e.zero),branchSelect:String(Number(e.branch)),takeBranch:hex(e.target),sequential:hex(e.pc4),pcReturn:hex(e.nextPC),aluDecode:`${e.aluControl} (${e.kind==='beq'?'SUB':'ADD'})`};}
function fieldPaths(name){return name==='opcode'?['opcode']:name==='rs'?['rs']:name==='rt'?state.kind==='lw'?['rtDest','destWrite']:['rt','readB']:name==='rd'?['rd','destWrite']:name==='funct'?['funct','aluDecode']:name==='immediate'?['imm',...(state.kind==='lw'?['extB','muxB']:['shift','branchOffset'])]:[];}
function highlight(){
 const l=lesson(state,step),special=selectedField?fieldPaths(selectedField):selectedSignal?['ctrl'+selectedSignal]:[];
 for(const [id,p] of paths){p.dataset.active=String(l.flows.includes(id));p.dataset.selected=String(special.includes(id));}
 for(const [id,n] of chips){n.dataset.active=String(l.nodes.includes(id));n.dataset.selected=String(id===selectedNode);}
 document.querySelectorAll('[data-field]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.field===selectedField));b.dataset.selected=String(b.dataset.field===selectedField);});
 document.querySelectorAll('[data-signal]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.signal===selectedSignal)));
}
function bits(){
 $('current-instruction').textContent=state.assembly;$('instruction-word').textContent=hex(state.word);
 const fields=instructionFields(state);
 $('instruction-strip').replaceChildren();$('instruction-fields').replaceChildren();
 for(const f of fields){
  const top=document.createElement('button');top.type='button';top.dataset.field=f.name;top.style.setProperty('--field-width',f.width);top.setAttribute('aria-label',`${f.name} ${f.high}:${f.low} · ${f.bits}`);top.innerHTML=`<span>${f.name} · ${f.width}</span><code>${f.bits}</code>`;$('instruction-strip').append(top);
  const b=document.createElement('button');b.type='button';b.dataset.field=f.name;b.innerHTML=`<span>${f.name}</span><small>[${f.high}:${f.low}] · ${f.width} bits</small><code>${f.bits}</code>`;$('instruction-fields').append(b);
 }
}
function signalRows(){
 const available=step>=1;$('control-status').textContent=available?`opcode=${binary(state.fields.opcode,6)} → ${state.kind==='r'?'R-format':state.kind}의 제어값. 신호를 누르면 연결된 배선을 강조합니다.`:'다음 단계에서 opcode를 해독하면 제어값이 나타납니다.';
 $('control-signals').innerHTML=SIGNALS.map(([name,node,meaning,selection])=>`<button class="signal-button" type="button" data-signal="${name}" data-destination="${node}" aria-pressed="false"><span>${name}</span><b>${available?state.control[name]:'—'}</b><small>${meaning}<br>${selection}</small></button>`).join('');
 $('derived-signals').innerHTML=`<dt>ALU Decoder 출력</dt><dd>${available?`${state.aluControl} · ${state.kind==='beq'?'SUB':'ADD'}`:'—'}</dd><dt>ALU의 Zero</dt><dd>${step>=3?state.zero:'—'}</dd><dt>PCSrc = Branch ∧ Zero</dt><dd>${step>=3?`${state.control.Branch} ∧ ${state.zero} = ${Number(state.branch)}`:'—'}</dd>`;
}
function update(){
 const l=lesson(state,step),s=snapshot(state,step),map=values();
 $('step-title').textContent=l.title;$('step-calculation').textContent=l.calc;$('step-why').textContent=l.why;$('step-watch').textContent=l.watch;
 $('scene-step').textContent=`${step+1} / 6 · ${STAGES[step]}`;$('state-title').textContent=step===5?'클록 경계 이후 저장 상태':'현재 저장 상태 · 아직 기록 전';
 $('register-values').innerHTML=[['PC',s.pc,step===5],...[8,9,10,16].map(n=>[`${REGISTER_NAMES[n]} · ${n}`,s.registers[n],step===5&&state.destination===n])].map(([name,value,changed])=>`<tr data-changed="${changed}"><td>${name}</td><td>${name==='PC'||name.startsWith('$s0')?hex(value):value}</td></tr>`).join('');
 $('memory-state').textContent=state.memory?`Memory[${hex(state.memory.address)}] = 42 · 메모리 값은 유지됩니다.`:'데이터 메모리를 읽거나 쓰지 않습니다.';
 $('flow-values').innerHTML=l.flows.filter(id=>!id.startsWith('ctrl')).map(id=>`<li><strong>${PATH_LABELS[id]}</strong><span>${map[id]||''}</span></li>`).join('');
 $('datapath-steps').innerHTML=STAGES.map((title,i)=>`<button type="button" data-step="${i}" ${i===step?'aria-current="step" disabled':''}><small>${i+1}</small>${title}</button>`).join('');
 for(const id of ['step-previous','scene-previous'])$(id).disabled=step===0;for(const id of ['step-next','scene-next'])$(id).disabled=step===5;
 document.querySelectorAll('[data-instruction]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.instruction===state.kind)));document.querySelectorAll('[data-branch]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.branch==='equal')===state.equal)));
 $('branch-options').hidden=state.kind!=='beq';signalRows();
 const shortHex=n=>'0x'+(n>>>0).toString(16).toUpperCase();
 const nodeValues={pc:shortHex(s.pc),imem:hex(state.word),plus4:step>=0?hex(state.pc4):'',regs:step>=2?(step===5&&state.destination!==null?'$t0 = '+state.value:`${state.a} / ${state.registers[state.fields.rt]}`):'',alusrc:step>=2?String(state.control.ALUSrc):'',alu:step>=3?(state.kind==='lw'?shortHex(state.alu):String(state.alu)):'',mem:state.kind==='lw'&&step>=4?'42':'',wb:step>=4&&state.kind!=='beq'?String(state.value):'',regdst:step>=1?String(state.control.RegDst):'',extend:state.kind!=='r'&&step>=2?String(state.fields.immediate):'',shift:state.kind==='beq'&&step>=4?String(state.shifted):'',target:state.kind==='beq'&&step>=4?hex(state.target):'',branch:step>=3?String(Number(state.branch)):'',nextpc:step>=4?String(Number(state.branch)):'',control:step>=1?binary(state.fields.opcode,6):'',aluctrl:step>=1?state.aluControl:''};
 document.querySelectorAll('[data-node-value]').forEach(t=>t.textContent=nodeValues[t.dataset.nodeValue]||'');
 svg.dataset.case=state.kind;svg.dataset.step=step;highlight();play();
}
function play(){
 packetLayer.replaceChildren();packets.length=0;
 for(const id of lesson(state,step).flows){const path=paths.get(id);if(!path)continue;const control=id.startsWith('ctrl')||['aluDecode','zero','branchSelect'].includes(id);packets.push({path,length:path.getTotalLength(),dot:element('circle',{r:control?5:7,class:'packet'+(control?' control-packet':'')},packetLayer)});}
 animation={start:performance.now(),duration:v?.reduced()?0:1700};svg.dataset.animating=String(animation.duration>0);if(animation.duration===0){place(1);animation=null;}v?.render();
}
function place(t){for(const {path,length,dot} of packets){const p=path.getPointAtLength(length*t);dot.setAttribute('cx',p.x);dot.setAttribute('cy',p.y);}}
if(v)v.onFrame(time=>{if(!animation)return false;const t=Math.min(1,(time-animation.start)/Math.max(1,animation.duration));place(t);if(t===1){animation=null;svg.dataset.animating='false';}return !!animation;});
function changeStep(next){step=Math.max(0,Math.min(5,next));selectedField=null;selectedSignal=null;selectedNode=null;update();if(step===1&&!v?.reduced())for(const [i,b] of [...$('instruction-strip').children].entries())b.animate([{transform:'translateY(-9px)',background:'#305c62'},{transform:'translateY(0)',background:'#132b3d'}],{duration:430,delay:i*45,easing:'cubic-bezier(.16,1,.3,1)'});}
document.querySelectorAll('[data-instruction]').forEach(b=>b.addEventListener('click',()=>{state=example(b.dataset.instruction);step=0;selectedField=null;selectedSignal=null;selectedNode=null;bits();update();}));
document.querySelectorAll('[data-branch]').forEach(b=>b.addEventListener('click',()=>{state=example('beq',b.dataset.branch==='equal');update();}));
$('datapath-steps').addEventListener('click',e=>{const b=e.target.closest('[data-step]');if(b)changeStep(Number(b.dataset.step));});
for(const id of ['step-previous','scene-previous'])$(id).addEventListener('click',()=>changeStep(step-1));for(const id of ['step-next','scene-next'])$(id).addEventListener('click',()=>changeStep(step+1));$('step-replay').addEventListener('click',play);
for(const id of ['instruction-strip','instruction-fields'])$(id).addEventListener('click',e=>{const b=e.target.closest('[data-field]');if(!b)return;selectedField=b.dataset.field;selectedSignal=null;selectedNode=null;$('selected-field-title').textContent=selectedField;$('selected-field-description').textContent=fieldMeaning(state,selectedField);highlight();revealExplanation('bits-chapter','selected-field-title');});
$('control-signals').addEventListener('click',e=>{const b=e.target.closest('[data-signal]');if(!b)return;selectedSignal=b.dataset.signal;selectedField=null;selectedNode=b.dataset.destination;highlight();const found=SIGNALS.find(([name])=>name===selectedSignal);$('part-name').textContent=selectedSignal;$('part-description').textContent=found[2]+'. '+found[3]+`. 이 예제 값: ${step>=1?state.control[selectedSignal]:'다음 단계에서 해독'}`;revealExplanation('part-chapter','part-name');});
function transform(){svg.style.transform=`translate(${pose.x}px,${pose.y}px) scale(${pose.scale})`;}
function reset(){pose.scale=Math.max(.65,Math.min(1,viewport.clientWidth/1270,viewport.clientHeight/820));pose.x=Math.max(10,(viewport.clientWidth-1250*pose.scale)/2);pose.y=Math.min(10,(viewport.clientHeight-800*pose.scale)/2);if(viewport.clientWidth<650){pose.x=10;pose.y=Math.min(0,viewport.clientHeight/2-360*pose.scale);}transform();}
function zoom(factor,x=viewport.clientWidth/2,y=viewport.clientHeight/2){const before=pose.scale;pose.scale=Math.max(.65,Math.min(2.2,pose.scale*factor));const k=pose.scale/before;pose.x=x-(x-pose.x)*k;pose.y=y-(y-pose.y)*k;transform();}
viewport.addEventListener('wheel',e=>{e.preventDefault();const r=viewport.getBoundingClientRect();zoom(e.deltaY<0?1.1:1/1.1,e.clientX-r.left,e.clientY-r.top);},{passive:false});
viewport.addEventListener('pointerdown',e=>{if(e.button!==0)return;down={x:e.clientX,y:e.clientY,moved:false};drag={x:pose.x,y:pose.y};});
viewport.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;down.moved=down.moved||Math.abs(dx)+Math.abs(dy)>5;if(down.moved&&!viewport.hasPointerCapture(e.pointerId))viewport.setPointerCapture(e.pointerId);pose.x=drag.x+dx;pose.y=drag.y+dy;transform();});
viewport.addEventListener('pointerup',e=>{drag=null;if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);});viewport.addEventListener('pointercancel',()=>{drag=null;});
viewport.addEventListener('keydown',e=>{if(e.target!==viewport)return;const shifts={ArrowLeft:[30,0],ArrowRight:[-30,0],ArrowUp:[0,30],ArrowDown:[0,-30]};if(shifts[e.key]){e.preventDefault();pose.x+=shifts[e.key][0];pose.y+=shifts[e.key][1];transform();}else if(['+','=','-','0'].includes(e.key)){e.preventDefault();if(e.key==='0')reset();else zoom(e.key==='-'?1/1.15:1.15);}});
$('diagram-in').addEventListener('click',()=>zoom(1.15));$('diagram-out').addEventListener('click',()=>zoom(1/1.15));$('reset-view').addEventListener('click',reset);
let previousWidth=viewport.clientWidth;new ResizeObserver(()=>{const width=viewport.clientWidth;if(Math.abs(width-previousWidth)>80){previousWidth=width;reset();}}).observe(viewport);
bits();update();reset();
