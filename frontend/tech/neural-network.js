import {XORNetwork,XOR_DATA} from './neural-math.js';
import {THREE,createViewer,solid,connect} from './lab-viewer.js';
const viewer=createViewer({cameraPosition:[1,3.4,20]});
if(viewer)initialize(viewer);
function initialize(v){
  let model=new XORNetwork(),selected=1,phase=0,rate=.5,automatic=null,timer=null,flowStart=0;
  const stages=[['입력 준비','입력 두 개가 신경망으로 들어갑니다.'],['은닉층 계산','입력 × 가중치에 편향을 더하고 tanh를 통과시킵니다.'],['출력 계산','은닉값을 모아 sigmoid로 0~1 사이 확률을 계산합니다.'],['정답과 비교','선택한 예측은 정답과 비교하고, 평균 손실은 네 입력 전체에서 계산합니다.'],['역전파','네 입력의 평균 손실이 각 가중치에 미친 영향, 즉 기울기를 계산합니다.'],['가중치 갱신','가중치에서 학습률 × 기울기를 뺍니다. 1회는 네 입력 전체를 학습한 것입니다.']];
  const layers=[[1.5,-1.5].map(y=>new THREE.Vector3(-5,y,0)),[2.7,.9,-.9,-2.7].map((y,i)=>new THREE.Vector3(0,y,i%2?.4:-.4)),[new THREE.Vector3(5,0,0)]];
  const nodes=[],edges=[],dots=[];
  for(let l=0;l<layers.length;l++)nodes[l]=layers[l].map((position,j)=>({mesh:solid(v.scene,new THREE.SphereGeometry(.36,24,16),[0x57c9cd,0x9e88cf,0xe1b568][l],position.toArray()),label:v.label(`${['입력 x','은닉 h','출력 y'][l]}${l===2?'':j+1}`,position.clone().add(new THREE.Vector3(0,-.65,0)).toArray())}));
  for(let l=0;l<2;l++)for(let a=0;a<layers[l].length;a++)for(let b=0;b<layers[l+1].length;b++){
    const start=layers[l][a],end=layers[l+1][b];edges.push({l,a,b,start,end,mesh:connect(v.scene,start,end,0x5eaeb6)});
    const dot=solid(v.scene,new THREE.SphereGeometry(.085,10,8),0xffde92,start.toArray(),{emissive:0xf5bd61,emissiveIntensity:1});dot.visible=false;dots.push(dot);
  }
  const byId=id=>document.getElementById(id);
  function update(){
    const sample=XOR_DATA[selected],prediction=model.forward(sample.x),loss=model.loss();
    byId('nn-prediction').textContent=(prediction.output*100).toFixed(1)+'%';byId('nn-class').textContent=prediction.output>=.5?'1':'0';byId('nn-target').textContent=sample.y;
    byId('nn-epochs').textContent=model.epochs.toLocaleString('ko-KR');byId('nn-loss').textContent=loss.toFixed(4);
    byId('stage-name').textContent=stages[phase][0];byId('stage-description').textContent=stages[phase][1];
    document.querySelectorAll('[data-sample]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.sample)===selected)));
    byId('prediction-table').innerHTML=XOR_DATA.map(({x,y},i)=>{const p=model.forward(x).output;return `<tr data-selected="${i===selected}"><td>${x.join(', ')}</td><td>${y}</td><td>${(p*100).toFixed(1)}%</td><td>${p>=.5?1:0}</td></tr>`;}).join('');
    const values=[sample.x,prediction.h,[prediction.output]];
    for(let l=0;l<nodes.length;l++)for(let j=0;j<nodes[l].length;j++){const {mesh,label}=nodes[l][j],value=values[l][j];mesh.material.emissive.copy(mesh.material.color);mesh.material.emissiveIntensity=.04+Math.abs(value)*.45+(phase===l?.25:0);label.element.textContent=`${['x','h','y'][l]}${l===2?'':j+1} = ${value.toFixed(2)}`;label.width=label.element.offsetWidth;}
    edges.forEach(edge=>{const weight=edge.l===0?model.w1[edge.b][edge.a]:model.w2[edge.a],radius=.018+Math.min(3,Math.abs(weight))*.025;edge.mesh.scale.x=radius;edge.mesh.scale.z=radius;edge.mesh.material.color.set(weight>=0?0x71cfcd:0xdda6c7);edge.mesh.material.emissive.set(phase===4?0xe3ab50:0x000000);edge.mesh.material.emissiveIntensity=.45;});
    flowStart=performance.now();v.render();
  }
  function stop(){clearInterval(automatic);automatic=null;clearTimeout(timer);timer=null;byId('nn-auto').setAttribute('aria-pressed','false');byId('nn-auto').textContent='자동 학습';byId('nn-predict').textContent='예측 과정 보기';}
  function next(){phase=(phase+1)%stages.length;if(phase===5)model.train(1,rate);update();}
  byId('nn-step').onclick=()=>{stop();next();};
  byId('nn-predict').onclick=()=>{if(timer){stop();return;}stop();phase=0;update();byId('nn-predict').textContent='흐름 멈추기';const advance=()=>{if(document.hidden){stop();return;}if(phase>=3){stop();return;}phase++;update();timer=setTimeout(advance,v.reduced()?250:850);};timer=setTimeout(advance,v.reduced()?250:850);};
  byId('nn-train').onclick=()=>{stop();model.train(100,rate);phase=5;update();};
  byId('nn-auto').onclick=()=>{if(automatic){stop();return;}stop();const stopAt=model.epochs+5000;byId('nn-auto').setAttribute('aria-pressed','true');byId('nn-auto').textContent='학습 멈추기';automatic=setInterval(()=>{if(document.hidden){stop();return;}model.train(25,rate);phase=5;update();if(model.loss()<.01||model.epochs>=stopAt)stop();},250);};
  document.querySelectorAll('[data-sample]').forEach(button=>button.onclick=()=>{stop();selected=Number(button.dataset.sample);phase=0;update();});
  byId('learning-rate').oninput=event=>{rate=Number(event.target.value);byId('rate-value').textContent=rate.toFixed(2);};
  byId('nn-reset').onclick=()=>{stop();model=new XORNetwork();phase=0;update();};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',stop);
  v.onFrame(time=>{let active=false;for(let i=0;i<edges.length;i++){const edge=edges[i],dot=dots[i],elapsed=(time-flowStart)/900;const allowed=!v.reduced()&&elapsed<1&&elapsed>=0&&((phase===1&&edge.l===0)||(phase===2&&edge.l===1)||phase===4);dot.visible=allowed;if(allowed){dot.position.lerpVectors(edge.start,edge.end,phase===4?1-elapsed:elapsed);active=true;}}return active;});
  update();
}
