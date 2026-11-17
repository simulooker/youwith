import {THREE} from './lab-viewer.js?v=6';
import {chargeState,writeCarrierPosition,carrierGroupOffsets} from './device-lesson.js?v=5';

// Qualitative carrier redistribution inside silicon, not a Poisson/transport solver.
export function createCharges(v,channels,device){
  let stage=0,polarity='n',started=0,current=chargeState(0),from={...current},target={...current};
  const records=[],textures={};
  function texture(hole){
    const key=hole?'hole':'electron';if(textures[key])return textures[key];
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d');ctx.strokeStyle=ctx.fillStyle='#fff';ctx.lineWidth=7;ctx.beginPath();ctx.arc(32,32,hole?22:18,0,2*Math.PI);
    if(hole){ctx.stroke();ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(23,32);ctx.lineTo(41,32);ctx.moveTo(32,23);ctx.lineTo(32,41);ctx.stroke();}else ctx.fill();
    return textures[key]=new THREE.CanvasTexture(canvas);
  }
  function points(count,hole,r,kind){
    const positions=new Float32Array(count*3),g=new THREE.InstancedBufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(carrierGroupOffsets(r.style),3));
    g.setAttribute('carrierOrigin',new THREE.InstancedBufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));g.instanceCount=count;
    const material=new THREE.PointsMaterial({color:hole?0xffd077:0x77e5ff,size:hole?(r.style==='sheet'?.30:.38):(r.style==='sheet'?.32:.34),map:texture(hole),alphaTest:.08,toneMapped:false,transparent:true,opacity:1,depthWrite:false,depthTest:true});
    // One moving origin supplies four fixed offsets on the GPU, sharing CPU work and uploads.
    material.onBeforeCompile=shader=>{shader.vertexShader='attribute vec3 carrierOrigin;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed += carrierOrigin;');};
    material.customProgramCacheKey=()=> 'carrier-group-v1';
    const object=new THREE.Points(g,material);object.renderOrder=2;object.frustumCulled=false;object.userData.carrierKind=kind;object.userData.channelStyle=r.style;object.userData.polarity=r.polarity;object.userData.carriersPerGroup=4;v.scene.add(object);return {object,positions,count,kind};
  }
  function boundary(){const mesh=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1,1,1)),new THREE.LineBasicMaterial({color:0xb4a2f2,toneMapped:false,transparent:true,opacity:.8}));v.scene.add(mesh);return mesh;}
  for(const c of channels){
    const mobile=points(48,c.polarity==='p',c,'mobile'),majority=points(device==='mosfet'?32:8,c.polarity!=='p',c,'majority'),minority=points(device==='mosfet'?6:3,c.polarity==='p',c,'minority'),ends=points(24,c.polarity==='p',c,'ends');
    const junctions=device==='mosfet'?[-1,1].map(side=>({side,bottom:boundary(),inner:boundary()})):[],arrows=[];
    if(!records.some(r=>r.polarity===c.polarity)){
      const vectors=c.style==='flat'?[[[0,.9,1.25],[0,-1,0],.72]]:c.style==='fin'?[[[0,2.4,0],[0,-1,0],.72],[[0,.8,.95],[0,0,-1],.73]]:[[[0,c.y+.7,0],[0,-1,0],.61],[[0,c.y,1.5],[0,0,-1],.6]];
      for(const [pos,dir,length] of vectors){const d=new THREE.Vector3(...dir),origin=new THREE.Vector3(...pos);if(c.polarity==='p'){origin.addScaledVector(d,length);d.negate();}const arrow=new THREE.ArrowHelper(d,origin,length,0xa7e58c,.18,.10);v.scene.add(arrow);arrows.push(arrow);}
    }
    records.push({...c,clouds:[mobile,majority,minority,ends],junctions,arrows});
  }
  function set(nextStage,nextPolarity,replay=false){from=replay?chargeState(Math.max(0,nextStage-1)):{...current};stage=nextStage;polarity=nextPolarity;target=chargeState(stage);started=performance.now();v.render();}
  function draw(time,hidden){
    const elapsed=Math.max(0,(time-started)/1000),progress=v.reduced()?1:Math.min(1,elapsed/1.7),e=1-Math.pow(1-progress,3);
    for(const key of Object.keys(current))current[key]=from[key]+(target[key]-from[key])*e;
    const state={...current,drift:stage===3&&!v.reduced()?elapsed*.14:null},active=!hidden&&!v.reduced()&&(progress<1||stage===3);
    for(const r of records){
      const visible=!hidden&&r.polarity===polarity;
      for(const j of r.junctions){const width=.20+(j.side===1?.22*current.junction:0);j.bottom.visible=j.inner.visible=visible;j.bottom.position.set(j.side*2.2,-.195-width/2,1.0);j.bottom.scale.set(1.6,width,1.2);j.inner.position.set(j.side*(1.4-width/2),-.02,1.0);j.inner.scale.set(width,.35,1.2);}
      for(const arrow of r.arrows)arrow.visible=visible&&stage>0&&stage<4;
      for(const cloud of r.clouds){
        cloud.object.visible=visible;if(!visible)continue;
        if(cloud.lastFill!==current.fill||cloud.lastDepletion!==current.depletion||(cloud.kind==='mobile'&&cloud.lastDrift!==state.drift)){
          for(let i=0;i<cloud.count;i++)writeCarrierPosition(cloud.positions,i*3,r,cloud.kind,i,state);
          cloud.object.geometry.attributes.carrierOrigin.needsUpdate=true;cloud.lastFill=current.fill;cloud.lastDepletion=current.depletion;cloud.lastDrift=state.drift;
        }
      }
    }
    Object.assign(v.canvas.dataset,{channelFill:current.fill.toFixed(2),gateDepletion:current.depletion.toFixed(2),drainDepletion:(.20+.22*current.junction).toFixed(3),chargeStage:String(stage),chargePolarity:polarity,chargeProgress:progress.toFixed(2),moving:String(active),holeSymbol:'ring-plus',carrierLocation:'inside-silicon',minorityCarriers:'visible',carriersPerGroup:'4',carrierCount:String(records.filter(r=>r.polarity===polarity).reduce((n,r)=>n+r.clouds.reduce((sum,c)=>sum+c.count*4,0),0))});
    return active;
  }
  return {set,draw};
}
