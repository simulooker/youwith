import {THREE,createViewer,solid,connect} from './lab-viewer.js';
import {FRUIT_DATA,buildTree,predictTree,bestSplit} from './decision-tree-math.js';
const v=createViewer({cameraPosition:[1,4,25]});
if(v){
  let depth=0,root=buildTree(FRUIT_DATA,depth),group=new THREE.Group(),nodeViews=new Map(),labelElements=[],edgeViews=[],timer=null,active=[];v.scene.add(group);
  const byId=id=>document.getElementById(id),names=['사과','오렌지'];
  function inputs(){return [Number(byId('fruit-mass').value),Number(byId('fruit-diameter').value)];}
  function stop(){clearInterval(timer);timer=null;byId('tree-path').textContent='예측 경로 보기';}
  function highlight(path){active=path;for(const [id,view] of nodeViews){view.material.emissive.set(path.includes(id)?0xc99c43:0x000000);view.material.emissiveIntensity=.55;}for(const edge of edgeViews){edge.mesh.material.color.set(path.includes(edge.child)&&path.includes(edge.parent)?0xedc76f:0x54818e);}v.render();}
  function update(){const x=inputs(),result=predictTree(root,x);byId('mass-value').textContent=x[0]+' g';byId('diameter-value').textContent=x[1].toFixed(1)+' cm';byId('tree-prediction').textContent=names[result.prediction];byId('tree-probability').textContent='학습 표본 중 오렌지 비율 '+(result.probability*100).toFixed(0)+'%';byId('tree-depth').textContent=depth;function remaining(node){return node.feature===null?node.count*node.impurity:remaining(node.left)+remaining(node.right);}byId('tree-impurity').textContent=(remaining(root)/root.count).toFixed(3);byId('tree-rule').textContent=root.feature===null?'아직 분할 전이에요. 한 단계 학습해보세요.':`${root.feature===0?'질량':'지름'} ≤ ${root.threshold.toFixed(2)}${root.feature===0?' g':' cm'} · 지니 감소 ${root.gain.toFixed(3)}`;highlight(result.path);}
  function build(){
    stop();v.scene.remove(group);group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});for(const element of labelElements)element.remove();for(let i=v.labels.length-1;i>=0;i--)if(labelElements.includes(v.labels[i].element))v.labels.splice(i,1);
    labelElements=[];group=new THREE.Group();v.scene.add(group);nodeViews=new Map();edgeViews=[];root=buildTree(FRUIT_DATA,depth);let leaf=0;const entries=[];
    function layout(node,d){let x;if(node.feature===null)x=leaf++*2.8;else{x=(layout(node.left,d+1)+layout(node.right,d+1))/2;}entries.push({node,x,d});return x;}layout(root,0);const center=(leaf-1)*1.4;
    const positions=new Map(entries.map(({node,x,d})=>[node.id,new THREE.Vector3(x-center,3.2-d*2.3,0)]));
    for(const {node} of entries){const position=positions.get(node.id),mesh=solid(group,new THREE.SphereGeometry(.34,22,14),node.feature===null?(node.prediction===0?0x70c9bb:0xe2b568):0x91b7c4,position.toArray());nodeViews.set(node.id,mesh);const text=node.feature===null?`${names[node.prediction]} · ${node.count}개`:`${node.feature===0?'질량':'지름'} ≤ ${node.threshold.toFixed(1)}`;const label=v.label(text,position.clone().add(new THREE.Vector3(0,-.65,0)).toArray());label.element.title=`표본 ${node.count}개, 지니 ${node.impurity.toFixed(3)}, 사과 ${node.counts[0]} / 오렌지 ${node.counts[1]}`;labelElements.push(label.element);if(node.feature!==null)for(const child of [node.left,node.right]){edgeViews.push({parent:node.id,child:child.id,mesh:connect(group,position,positions.get(child.id),0x54818e,.035)});}}
    byId('tree-step').disabled=depth>=Number(byId('max-depth').value);update();
  }
  byId('tree-step').onclick=()=>{depth=Math.min(depth+1,Number(byId('max-depth').value));build();};byId('tree-train').onclick=()=>{depth=Number(byId('max-depth').value);build();};byId('tree-reset').onclick=()=>{depth=0;build();};
  byId('max-depth').onchange=()=>{depth=Math.min(depth,Number(byId('max-depth').value));build();};
  for(const id of ['fruit-mass','fruit-diameter'])byId(id).oninput=()=>{stop();update();};
  byId('tree-path').onclick=()=>{if(timer){stop();return;}const path=predictTree(root,inputs()).path;let index=1;highlight(path.slice(0,index));byId('tree-path').textContent='경로 멈추기';timer=setInterval(()=>{index++;highlight(path.slice(0,index));if(index>=path.length)stop();},v.reduced()?250:700);};
  byId('training-data').innerHTML=FRUIT_DATA.map(({x,y})=>`<tr><td>${x[0]} g</td><td>${x[1].toFixed(1)} cm</td><td>${names[y]}</td></tr>`).join('');
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',stop);build();
}
