import * as THREE from '../vendor/three/three.module.js';
import {OrbitControls} from '../vendor/three/OrbitControls.js';

const canvas=document.querySelector('#mosfet-canvas');
const message=document.querySelector('#scene-message');
const container=document.querySelector('#scene');
let savedMotion=false;
try{savedMotion=JSON.parse(localStorage.getItem('youwith.preferences'))?.reduceMotion===true;}catch{}
document.documentElement.dataset.reducedMotion=String(savedMotion);
const systemMotion=matchMedia('(prefers-reduced-motion:reduce)');
const reduceMotion=()=>savedMotion||systemMotion.matches;

function initialize(){
  let renderer;
  try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});}
  catch{message.textContent='이 기기에서 3D 그래픽을 시작하지 못했어요. WebGL을 지원하는 브라우저로 열어주세요.';return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setClearColor(0x080e19);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.25;
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(35,1,.1,160);
  const controls=new OrbitControls(camera,canvas);
  controls.enableDamping=!reduceMotion();controls.dampingFactor=.09;
  controls.enablePan=false;controls.minDistance=6.8;controls.maxDistance=23;
  controls.autoRotateSpeed=.65;controls.minPolarAngle=.12;controls.maxPolarAngle=Math.PI-.12;
  controls.target.set(0,0,0);
  const model=new THREE.Group();model.name='MOSFET';scene.add(model);
  const labels=new THREE.Group();model.add(labels);
  const palette={body:0x72648e,source:0x42aebf,drain:0x8195ce,oxide:0x9dd9c4,gate:0xd7ad63};
  function box(name,size,position,color,metalness=.12){
    const geometry=new THREE.BoxGeometry(...size);
    const material=new THREE.MeshStandardMaterial({color,roughness:.36,metalness});
    const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.position.set(...position);model.add(mesh);
    const edge=new THREE.LineSegments(new THREE.EdgesGeometry(geometry),new THREE.LineBasicMaterial({color:0xd5e4ef,transparent:true,opacity:.2}));mesh.add(edge);
    return mesh;
  }
  // A planar NMOS cutaway: n+ regions are embedded in p-Si; oxide separates gate and silicon.
  box('p-type substrate',[5.8,.94,3.4],[0,-.47,0],palette.body);
  // The front cutaway exposes the junctions without overlapping a solid body mesh.
  box('p-Si channel region',[2.4,.34,3.4],[0,.17,0],palette.body);
  box('p-Si left margin',[.5,.34,3.4],[-2.65,.17,0],palette.body);
  box('p-Si right margin',[.5,.34,3.4],[2.65,.17,0],palette.body);
  box('n+ source',[1.2,.34,3.4],[-1.8,.17,0],palette.source);
  box('n+ drain',[1.2,.34,3.4],[1.8,.17,0],palette.drain);
  box('gate oxide',[2.4,.085,3.4],[0,.3825,0],palette.oxide,.06);
  box('gate electrode',[2.16,.37,3.18],[0,.61,0],palette.gate,.65);
  box('source contact',[.7,.12,2.5],[-1.8,.4,0],0xc7dae2,.8);
  box('drain contact',[.7,.12,2.5],[1.8,.4,0],0xc7dae2,.8);
  box('gate terminal',[.72,.38,.72],[0,.985,0],palette.gate,.8);

  const labelItems=[];
  function label(text,x,y,z,color){
    const element=document.createElement('span');element.className='scene-label';element.textContent=text;element.style.borderColor=color;container.append(element);
    labelItems.push({element,anchor:new THREE.Vector3(x,y,z),projected:new THREE.Vector3(),width:element.offsetWidth});
  }
  function placeLabels(){
    const width=container.clientWidth,height=container.clientHeight;
    const placed=[];
    for(const item of labelItems){
      item.element.hidden=!labels.visible;if(!labels.visible)continue;
      item.projected.copy(item.anchor).project(camera);
      let x=THREE.MathUtils.clamp((item.projected.x+1)*width/2-item.width/2,8,width-item.width-8);
      let y=THREE.MathUtils.clamp((1-item.projected.y)*height/2-17,width<600?24:140,height-60);
      for(const previous of placed)if(x<previous.x+previous.width+6&&x+item.width+6>previous.x&&Math.abs(y-previous.y)<36)y=previous.y+38;
      item.element.style.transform=`translate3d(${Math.round(x)}px,${Math.round(y)}px,0)`;
      placed.push({x,y,width:item.width});
    }
  }
  label('Gate',0,1.75,0,'#dbb56d');
  label('Source · n⁺',-2.6,.95,1.9,'#51c3d5');
  label('Drain · n⁺',2.6,.95,-1.8,'#91a7ed');
  label('Oxide · SiO₂',.4,.38,-2.6,'#bce5d7');
  label('Body · p-Si',.6,-1.04,2,'#a998ce');

  scene.add(new THREE.HemisphereLight(0xd3e6ff,0x293041,2.7));
  const key=new THREE.DirectionalLight(0xfff0d7,4.3);key.position.set(3,7,5);scene.add(key);
  const rim=new THREE.DirectionalLight(0x8dbce4,2.5);rim.position.set(-5,2,-4);scene.add(rim);
  const fill=new THREE.DirectionalLight(0xaaa1cf,1.4);fill.position.set(1,-3,4);scene.add(fill);

  // A wireframe room gives rotation a spatial reference without blocking the device.
  scene.background=new THREE.Color(0x0a1019);
  scene.fog=new THREE.Fog(0x0a1019,23,60);
  const room=new THREE.Group();room.name='Grid room';scene.add(room);
  function gridPlane(origin,u,v,width,height,step=2){
    const points=[];
    function segment(x1,y1,x2,y2){
      points.push(origin[0]+u[0]*x1+v[0]*y1,origin[1]+u[1]*x1+v[1]*y1,origin[2]+u[2]*x1+v[2]*y1,
        origin[0]+u[0]*x2+v[0]*y2,origin[1]+u[1]*x2+v[1]*y2,origin[2]+u[2]*x2+v[2]*y2);
    }
    for(let x=-width/2;x<=width/2;x+=step)segment(x,-height/2,x,height/2);
    for(let y=-height/2;y<=height/2;y+=step)segment(-width/2,y,width/2,y);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
    room.add(new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0x496378,transparent:true,opacity:.46})));
  }
  gridPlane([0,-4,0],[1,0,0],[0,0,1],40,40);
  gridPlane([0,20,0],[1,0,0],[0,0,1],40,40);
  gridPlane([0,8,-20],[1,0,0],[0,1,0],40,24);
  gridPlane([0,8,20],[1,0,0],[0,1,0],40,24);
  gridPlane([-20,8,0],[0,0,1],[0,1,0],40,24);
  gridPlane([20,8,0],[0,0,1],[0,1,0],40,24);
  const frameGeometry=new THREE.EdgesGeometry(new THREE.BoxGeometry(40,24,40));
  const roomFrame=new THREE.LineSegments(frameGeometry,new THREE.LineBasicMaterial({color:0x66889e,transparent:true,opacity:.65}));roomFrame.position.y=8;room.add(roomFrame);

  let frame=0,lastTime=0;
  function draw(time){frame=0;if(document.hidden)return;const delta=Math.min((time-lastTime)/1000,.05);lastTime=time;controls.update(delta);renderer.render(scene,camera);placeLabels();if(controls.autoRotate)schedule();}
  function schedule(){if(!frame&&!document.hidden)frame=requestAnimationFrame(draw);}
  controls.addEventListener('change',schedule);
  controls.addEventListener('start',()=>{lastTime=performance.now();schedule();});
  function reset(){controls.target.set(0,.1,0);camera.position.set(8,6.8,10.8);controls.update();schedule();}
  function resize(){const width=container.clientWidth,height=container.clientHeight;renderer.setSize(width,height,false);camera.aspect=width/height;camera.zoom=width<600?Math.min(.7,width/height*.96):1;camera.updateProjectionMatrix();for(const item of labelItems)item.width=item.element.offsetWidth;schedule();}
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(container);
  document.querySelector('#reset-view').onclick=reset;
  const rotateButton=document.querySelector('#auto-rotate');
  rotateButton.onclick=()=>{controls.autoRotate=!controls.autoRotate;rotateButton.setAttribute('aria-pressed',String(controls.autoRotate));rotateButton.querySelector('span').textContent=controls.autoRotate?'회전 멈추기':'자동 회전';lastTime=performance.now();schedule();};
  const labelsButton=document.querySelector('#toggle-labels');
  labelsButton.onclick=()=>{labels.visible=!labels.visible;labelsButton.setAttribute('aria-pressed',String(labels.visible));schedule();};
  canvas.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0'].includes(event.key))return;event.preventDefault();
    if(event.key==='0'){reset();return;}
    const offset=camera.position.clone().sub(controls.target),spherical=new THREE.Spherical().setFromVector3(offset);
    if(event.key==='ArrowLeft')spherical.theta-=.12;if(event.key==='ArrowRight')spherical.theta+=.12;
    if(event.key==='ArrowUp')spherical.phi-=.12;if(event.key==='ArrowDown')spherical.phi+=.12;
    if(event.key==='+'||event.key==='=')spherical.radius*=.9;if(event.key==='-')spherical.radius*=1.1;
    spherical.phi=THREE.MathUtils.clamp(spherical.phi,.12,Math.PI-.12);spherical.radius=THREE.MathUtils.clamp(spherical.radius,controls.minDistance,controls.maxDistance);
    camera.position.copy(controls.target).add(offset.setFromSpherical(spherical));controls.update();schedule();
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{lastTime=performance.now();schedule();}});
  systemMotion.addEventListener('change',()=>{controls.enableDamping=!reduceMotion();if(reduceMotion()&&controls.autoRotate)rotateButton.click();schedule();});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();controls.autoRotate=false;cancelAnimationFrame(frame);frame=0;message.hidden=false;message.textContent='3D 그래픽 연결이 중단됐어요. 새로고침하면 다시 볼 수 있어요.';});
  window.addEventListener('pagehide',event=>{cancelAnimationFrame(frame);frame=0;if(event.persisted)return;resizeObserver.disconnect();controls.dispose();scene.traverse(object=>{object.geometry?.dispose();if(object.material){const materials=Array.isArray(object.material)?object.material:[object.material];for(const material of materials){material.map?.dispose();material.dispose();}}});renderer.dispose();});
  window.addEventListener('pageshow',()=>{lastTime=performance.now();schedule();});
  reset();resize();message.hidden=true;canvas.dataset.ready='true';
}
initialize();
