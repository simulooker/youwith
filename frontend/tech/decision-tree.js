import {THREE,createViewer,solid,connect} from './lab-viewer.js?v=3';
import {SCENARIOS} from './learning-scenarios.js?v=1';
import {scenarioControls} from './scenario-controls.js';
const v=createViewer({cameraPosition:[1,4,25]});
if(v){
  const data=SCENARIOS.tree,$=id=>document.getElementById(id),names=['사과','오렌지'];let group=null,labelElements=[],views=new Map(),edges=[],oldSnapshot=-1;
  function drawTree(s,index){
    if(index===oldSnapshot)return;oldSnapshot=index;
    if(group){v.scene.remove(group);group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
    for(const el of labelElements)el.remove();for(let i=v.labels.length-1;i>=0;i--)if(labelElements.includes(v.labels[i].element))v.labels.splice(i,1);
    labelElements=[];views=new Map();edges=[];group=new THREE.Group();v.scene.add(group);let leaf=0;const entries=[];
    function layout(node,depth){const x=node.feature===null?leaf++*3.2:(layout(node.left,depth+1)+layout(node.right,depth+1))/2;entries.push({node,x,depth});return x;}layout(s.tree,0);
    const center=(leaf-1)*1.6,positions=new Map(entries.map(({node,x,depth})=>[node.id,new THREE.Vector3(x-center,3.2-depth*2.3,0)]));
    for(const {node} of entries){const pos=positions.get(node.id),mesh=solid(group,new THREE.SphereGeometry(.34,22,14),node.feature===null?(node.prediction===0?0x70c9bb:0xe2b568):0x91b7c4,pos.toArray());views.set(node.id,mesh);
      const text=node.feature===null?`${names[node.prediction]} · ${node.count}개`:`${node.feature===0?'질량':'지름'} ≤ ${node.threshold}${node.feature===0?' g':' cm'}`;
      const label=v.label(text,pos.clone().add(new THREE.Vector3(0,-.65,0)).toArray());label.element.title=`표본 ${node.count}개 · 사과 ${node.counts[0]} / 오렌지 ${node.counts[1]} · 지니 ${node.impurity.toFixed(3)}`;labelElements.push(label.element);
      if(node.feature!==null)for(const child of [node.left,node.right])edges.push({parent:node.id,child:child.id,mesh:connect(group,pos,positions.get(child.id),0x54818e,.035)});
    }
  }
  $('training-data').innerHTML=data.data.map(({x,y})=>`<tr><td>${x[0]} g</td><td>${x[1].toFixed(1)} cm</td><td>${names[y]}</td></tr>`).join('');
  scenarioControls(data.cases,(c,stage)=>{
    const s=data.snapshots[stage.snapshot];drawTree(s,stage.snapshot);const path=s.result.path.slice(0,stage.pathLength);
    for(const [id,mesh] of views){mesh.material.emissive.set(path.includes(id)?0xc99c43:0x000000);mesh.material.emissiveIntensity=.55;}
    for(const edge of edges)edge.mesh.material.color.set(path.includes(edge.child)&&path.includes(edge.parent)?0xedc76f:0x54818e);
    $('case-summary').textContent='같은 가상 사과: 질량 170 g · 지름 6.4 cm · 정답 사과';
    $('tree-prediction').textContent=names[s.result.prediction];$('tree-probability').textContent='도착한 잎의 오렌지 비율 '+(s.result.probability*100).toFixed(0)+'%';
    $('tree-depth').textContent=s.depth;$('tree-impurity').textContent=s.impurity.toFixed(3);$('tree-accuracy').textContent=`학습 표본 ${s.correct} / 10개 정답`;
    $('result-line').textContent=s.result.prediction===data.target?'이 표본은 정답과 일치해요.':'이 표본은 오렌지로 잘못 분류해요.';
    $('saved-values').textContent=`특성 2개 · 지니 불순도 · 중간값 임계 후보 · 적용 깊이 ${s.depth} · 같은 값은 왼쪽으로 이동`;
    v.render();
  });
}
