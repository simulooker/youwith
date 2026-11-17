import * as THREE from '../vendor/three/three.module.js';
import {OrbitControls} from '../vendor/three/OrbitControls.js';
export {THREE};
export function createViewer({cameraPosition=[8,6.8,10.8],target=[0,0,0]}={}){
  const canvas=document.querySelector('#lab-canvas'),container=document.querySelector('#scene'),message=document.querySelector('#scene-message');
  let renderer;try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});}catch{message.textContent='3D 그래픽을 시작하지 못했어요. WebGL을 지원하는 브라우저로 열어주세요.';return null;}
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x0a1019);scene.fog=new THREE.Fog(0x0a1019,25,65);
  const camera=new THREE.PerspectiveCamera(35,1,.1,160),controls=new OrbitControls(camera,canvas);
  let saved=false;try{saved=JSON.parse(localStorage.getItem('youwith.preferences'))?.reduceMotion===true;}catch{}
  document.documentElement.dataset.reducedMotion=String(saved);
  const media=matchMedia('(prefers-reduced-motion:reduce)'),reduced=()=>saved||media.matches;
  controls.enablePan=true;controls.screenSpacePanning=true;controls.mouseButtons.RIGHT=THREE.MOUSE.PAN;controls.enableDamping=!reduced();controls.dampingFactor=.1;controls.minDistance=7;controls.maxDistance=32;controls.minPolarAngle=.1;controls.maxPolarAngle=Math.PI-.1;
  scene.add(new THREE.HemisphereLight(0xd3e6ff,0x293041,2.7));
  for(const [color,intensity,position] of [[0xfff0d7,4,[3,7,5]],[0x8dbce4,2.4,[-5,2,-4]],[0xaaa1cf,1.3,[1,-3,4]]]){const light=new THREE.DirectionalLight(color,intensity);light.position.set(...position);scene.add(light);}
  const gridPoints=[];
  function plane(origin,u,v,w,h){const line=(x,y,X,Y)=>{for(const [a,b] of [[x,y],[X,Y]])gridPoints.push(origin[0]+u[0]*a+v[0]*b,origin[1]+u[1]*a+v[1]*b,origin[2]+u[2]*a+v[2]*b);};for(let x=-w/2;x<=w/2;x+=2)line(x,-h/2,x,h/2);for(let y=-h/2;y<=h/2;y+=2)line(-w/2,y,w/2,y);}
  plane([0,-4,0],[1,0,0],[0,0,1],40,40);plane([0,20,0],[1,0,0],[0,0,1],40,40);for(const z of [-20,20])plane([0,8,z],[1,0,0],[0,1,0],40,24);for(const x of [-20,20])plane([x,8,0],[0,0,1],[0,1,0],40,24);
  const gridGeometry=new THREE.BufferGeometry();gridGeometry.setAttribute('position',new THREE.Float32BufferAttribute(gridPoints,3));scene.add(new THREE.LineSegments(gridGeometry,new THREE.LineBasicMaterial({color:0x496378,transparent:true,opacity:.46})));
  const labels=[];let frame=0,tick=()=>false,labelWidth=container.clientWidth,viewportWidth=container.clientWidth,viewportHeight=container.clientHeight,lost=false,disposed=false;
  function requestFrame(){if(!frame&&!document.hidden&&!lost&&!disposed)frame=requestAnimationFrame(draw);}
  function draw(time){
    frame=0;if(document.hidden||lost||disposed)return;
    const active=tick(time);controls.update();renderer.render(scene,camera);
    for(const item of labels){if(!item.element.hidden){
      item.projected.copy(item.position).project(camera);
      const x=THREE.MathUtils.clamp((item.projected.x+1)*viewportWidth/2-item.width/2,5,labelWidth-item.width-5),y=THREE.MathUtils.clamp((1-item.projected.y)*viewportHeight/2,8,viewportHeight-38),transform=`translate3d(${Math.round(x)}px,${Math.round(y)}px,0)`;
      if(item.transform!==transform){item.element.style.transform=transform;item.transform=transform;}
    }}
    if(active)requestFrame();
  }
  function render(){requestFrame();}
  function label(text,position){const element=document.createElement('span');element.className='node-label scene-label';element.textContent=text;container.append(element);const item={element,position:new THREE.Vector3(...position),projected:new THREE.Vector3(),width:element.offsetWidth};labels.push(item);return item;}
  function reset(){controls.target.set(...target);camera.position.set(...cameraPosition);controls.update();render();}
  function resize(){
    if(disposed)return;
    const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;
    const panel=document.querySelector('#explanation-panel'),reserved=panel&&w>800?panel.offsetWidth+48:0,ratio=Math.min(devicePixelRatio||1,1.5),scale=Math.min(1,Math.sqrt(2560*1440/(w*h*ratio*ratio))),bufferWidth=Math.floor(w*ratio*scale),bufferHeight=Math.floor(h*ratio*scale);
    viewportWidth=w;viewportHeight=h;labelWidth=w-reserved;
    if(canvas.width!==bufferWidth||canvas.height!==bufferHeight)renderer.setSize(bufferWidth,bufferHeight,false);
    camera.aspect=w/h;camera.setViewOffset(w,h,reserved/2,0,w,h);camera.zoom=labelWidth<600?Math.min(.8,labelWidth/h*.96):1;camera.updateProjectionMatrix();
    for(const item of labels){const width=item.element.offsetWidth;if(width)item.width=width;}
    render();
  }
  controls.addEventListener('change',render);const observer=new ResizeObserver(resize);observer.observe(container);const panel=document.querySelector('#explanation-panel');if(panel)observer.observe(panel);window.addEventListener('lab-panel-change',resize);
  canvas.addEventListener('contextmenu',event=>event.preventDefault());
  canvas.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0'].includes(event.key))return;event.preventDefault();if(event.key==='0'){reset();return;}const offset=camera.position.clone().sub(controls.target),s=new THREE.Spherical().setFromVector3(offset);if(event.key==='ArrowLeft')s.theta-=.1;if(event.key==='ArrowRight')s.theta+=.1;if(event.key==='ArrowUp')s.phi-=.1;if(event.key==='ArrowDown')s.phi+=.1;if(event.key==='+'||event.key==='=')s.radius*=.9;if(event.key==='-')s.radius*=1.1;s.phi=THREE.MathUtils.clamp(s.phi,.1,Math.PI-.1);s.radius=THREE.MathUtils.clamp(s.radius,controls.minDistance,controls.maxDistance);camera.position.copy(controls.target).add(offset.setFromSpherical(s));controls.update();render();});
  document.querySelector('#reset-view')?.addEventListener('click',reset);
  media.addEventListener('change',()=>{controls.enableDamping=!reduced();render();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else render();});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;cancelAnimationFrame(frame);frame=0;tick=()=>false;message.hidden=false;message.textContent='3D 연결이 중단됐어요. 새로고침해주세요.';});
  window.addEventListener('pagehide',e=>{cancelAnimationFrame(frame);frame=0;if(e.persisted)return;disposed=true;observer.disconnect();controls.dispose();const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});geometries.forEach(g=>g.dispose());materials.forEach(m=>{if(m.map)textures.add(m.map);m.dispose();});textures.forEach(t=>t.dispose());renderer.dispose();});window.addEventListener('pageshow',render);
  reset();resize();message.hidden=true;canvas.dataset.ready='true';
  return {scene,camera,controls,canvas,render,label,labels,reduced,onFrame:fn=>{tick=fn;render();},reset};
}
export function solid(scene,geometry,color,position,options={}){const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.35,metalness:.25,...options}));mesh.position.set(...position);scene.add(mesh);return mesh;}
export function connect(scene,a,b,color,radius=.025){const direction=b.clone().sub(a),mesh=solid(scene,new THREE.CylinderGeometry(1,1,1,8),color,[0,0,0]);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize());mesh.scale.set(radius,direction.length(),radius);return mesh;}
