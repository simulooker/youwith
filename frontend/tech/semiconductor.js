import {THREE,createViewer,solid} from './lab-viewer.js';
const device=document.body.dataset.device;
const v=createViewer({cameraPosition:device==='cfet'?[9,8,14]:[8,6.8,12],target:[0,device==='cfet'?1.5:.6,0]});
if(v){
  const cutFaces=[],gold=0xd7ad63,cyan=0x49b9c5,violet=0x9482c3,oxide=0xb5ded4;
  const box=(name,size,position,color,options)=>{const mesh=solid(v.scene,new THREE.BoxGeometry(...size),color,position,options);mesh.name=name;return mesh;};
  box('Silicon substrate',[7,.55,4.4],[0,-.7,0],0x73668f);box('Isolation',[6.8,.28,4.2],[0,-.285,0],0x9eb7bb);
  function contact(x,y,height,color){box('Source/drain region',[1.25,height,2.3],[x,y+height/2,0],color);box('Metal contact',[1.3,.2,2.35],[x,y+height+.1,0],0xc9d8dd,{metalness:.8});}
  function gateFrame(y){
    box('Top gate',[2.1,.15,2.4],[0,y+.3,0],gold,{metalness:.6});box('Bottom gate',[2.1,.15,2.4],[0,y-.3,0],gold,{metalness:.6});
    box('Back gate',[2.1,.45,.16],[0,y,-1.12],gold,{metalness:.6});
    cutFaces.push(box('Cutaway front gate',[2.1,.45,.16],[0,y,1.12],gold,{metalness:.6}));
    box('Gate dielectric',[2.05,.32,2.15],[0,y,0],oxide,{transparent:true,opacity:.28,depthWrite:false,metalness:0});
  }
  function nanosheets(base,color){
    for(let i=0;i<3;i++){const y=base+i*.78;box('Nanosheet channel',[5,.18,1.8],[0,y,0],color);gateFrame(y);}
    box('Gate connection',[2.1,2.5,.22],[0,base+.78,-1.4],gold,{metalness:.6});
    contact(-2.5,base-.32,2.2,color);contact(2.5,base-.32,2.2,color);
  }
  if(device==='finfet'){
    box('Raised silicon fin',[5.8,1.85,.42],[0,.78,0],cyan);
    contact(-2.35,-.14,1.6,cyan);contact(2.35,-.14,1.6,cyan);
    box('Fin dielectric',[2.2,1.94,.56],[0,.82,0],oxide,{transparent:true,opacity:.35,depthWrite:false});
    box('Gate top',[2.2,.22,.94],[0,1.91,0],gold,{metalness:.6});box('Gate back',[2.2,2,.2],[0,.8,-.43],gold,{metalness:.6});
    cutFaces.push(box('Cutaway gate front',[2.2,2,.2],[0,.8,.43],gold,{metalness:.6}));
    v.label('Fin · 돌출된 채널',[.2,1.5,-1.8]);v.label('Gate · 위·양옆 3면',[0,2.45,0]);
  }else if(device==='gaafet'){
    nanosheets(.45,cyan);v.label('Nanosheets · 3개 채널',[1.3,1.8,-2]);v.label('Gate · 채널 전체 둘레',[0,3.4,0]);
  }else if(device==='cfet'){
    nanosheets(.35,violet);box('Inter-device isolation',[6.4,.28,3.4],[0,2.75,0],oxide);
    nanosheets(3.4,cyan);v.label('nFET · 위쪽',[0,6.1,0]);v.label('pFET · 아래쪽',[.5,1.3,-2]);v.label('층간 절연막',[2.8,2.8,-1.6]);
  }
  v.label('Source',[-3.2,.9,1.8]);v.label('Drain',[3.3,.9,1.8]);
  let cutaway=true;const cutButton=document.querySelector('#cutaway');
  function showCut(){for(const face of cutFaces)face.visible=!cutaway;cutButton.setAttribute('aria-pressed',String(cutaway));v.render();}
  cutButton.onclick=()=>{cutaway=!cutaway;showCut();};
  document.querySelector('#toggle-labels').onclick=event=>{const visible=event.currentTarget.getAttribute('aria-pressed')!=='true';event.currentTarget.setAttribute('aria-pressed',String(visible));for(const label of v.labels)label.element.hidden=!visible;v.render();};
  showCut();v.render();
}
