import {THREE,createViewer,solid,connect} from './lab-viewer.js?v=3';
import {SCENARIOS} from './learning-scenarios.js?v=1';
import {scenarioControls} from './scenario-controls.js';
const v=createViewer({cameraPosition:[1,3.4,20]});
if(v){
  const data=SCENARIOS.network,$=id=>document.getElementById(id);
  const layers=[[1.5,-1.5].map(y=>new THREE.Vector3(-5,y,0)),[2.7,.9,-.9,-2.7].map((y,i)=>new THREE.Vector3(0,y,i%2?.4:-.4)),[new THREE.Vector3(5,0,0)]];
  const nodes=[],edges=[],dots=[];let phase=0,start=0;
  for(let l=0;l<layers.length;l++)nodes[l]=layers[l].map((position,j)=>({mesh:solid(v.scene,new THREE.SphereGeometry(.36,24,16),[0x57c9cd,0x9e88cf,0xe1b568][l],position.toArray()),label:v.label('',position.clone().add(new THREE.Vector3(0,-.65,0)).toArray())}));
  for(let l=0;l<2;l++)for(let a=0;a<layers[l].length;a++)for(let b=0;b<layers[l+1].length;b++){
    const from=layers[l][a],to=layers[l+1][b];edges.push({l,a,b,from,to,mesh:connect(v.scene,from,to,0x5eaeb6)});
    const dot=solid(v.scene,new THREE.SphereGeometry(.085,10,8),0xffde92,from.toArray(),{emissive:0xf5bd61,emissiveIntensity:.8});dot.visible=false;dots.push(dot);
  }
  scenarioControls(data.cases.map(c=>({...c,stages:data.stages})),(c,stage)=>{
    const s=data.snapshots[stage.snapshot],p=s.outputs[c.sample],values=[p.x,p.h,[p.output]];phase=stage.phase;start=performance.now();
    $('case-summary').textContent=`입력 (${p.x.join(', ')}) · 정답 ${p.y} · XOR 규칙: 다르면 1, 같으면 0`;
    $('nn-prediction').textContent=(p.output*100).toFixed(1)+'%';$('nn-class').textContent=p.output>=.5?'1':'0';$('nn-target').textContent=p.y;
    $('nn-epochs').textContent=s.epochs.toLocaleString('ko-KR');$('nn-loss').textContent=s.loss.toFixed(4);
    $('result-line').textContent=stage.snapshot===3?(p.output>=.5?1:0)===p.y?'학습 후 정답과 일치해요.':'학습 후에도 정답과 달라요.':'아직 학습 과정을 살펴보는 중이에요.';
    $('prediction-table').innerHTML=s.outputs.map((row,i)=>`<tr data-selected="${i===c.sample}"><td>${row.x.join(', ')}</td><td>${row.y}</td><td>${(row.output*100).toFixed(1)}%</td><td>${row.output>=.5?1:0}</td></tr>`).join('');
    for(let l=0;l<nodes.length;l++)for(let j=0;j<nodes[l].length;j++){
      const {mesh,label}=nodes[l][j],value=values[l][j],visible=phase>=l||phase>=3;
      mesh.material.emissive.copy(mesh.material.color);mesh.material.emissiveIntensity=visible?.08+Math.abs(value)*.45:.02;
      label.element.textContent=`${['x','h','y'][l]}${l===2?'':j+1} = ${visible?value.toFixed(2):'—'}`;label.width=label.element.offsetWidth;
    }
    for(const edge of edges){const weight=edge.l===0?s.w1[edge.b][edge.a]:s.w2[edge.a],radius=.018+Math.min(3,Math.abs(weight))*.025;edge.mesh.scale.x=radius;edge.mesh.scale.z=radius;edge.mesh.material.color.set(weight>=0?0x71cfcd:0xdda6c7);edge.mesh.material.emissive.set(phase===4?0xe3ab50:0x000000);edge.mesh.material.emissiveIntensity=.45;}
    $('saved-values').textContent=`학습률 ${data.rate} · w(x₁→h₁) ${s.w1[0][0].toFixed(4)} · 해당 기울기 ${s.gradients.w1[0][0].toFixed(5)} · 출력 편향 ${s.b2.toFixed(4)}`;
    v.render();
  });
  v.onFrame(time=>{let active=false;const t=(time-start)/1000;for(let i=0;i<edges.length;i++){
    const edge=edges[i],dot=dots[i];dot.visible=!v.reduced()&&t>=0&&t<1&&((phase===1&&edge.l===0)||(phase===2&&edge.l===1)||phase===4);
    if(dot.visible){dot.position.lerpVectors(edge.from,edge.to,phase===4?1-t:t);active=true;}
  }return active;});
}
