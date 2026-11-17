const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const load=()=>import(pathToFileURL(path.resolve(__dirname,'../frontend/tech/device-lesson.js')).href);
const within=(v,a,b)=>v>=a-1e-6&&v<=b+1e-6;
test('carrier centres remain inside actual silicon volumes during redistribution and drift',async()=>{
 const {writeCarrierPosition}=await load(),out=new Float32Array(3);
 for(const r of [{style:'flat',y:.14},{style:'fin',y:.8},...[.35,1.13,1.91,3.4,4.18,4.96].map(y=>({style:'sheet',y}))]){
  for(const [kind,count] of [['mobile',48],['majority',r.style==='flat'?32:8],['minority',r.style==='flat'?6:3],['ends',24]])for(let i=0;i<count;i++)for(const fraction of [0,.25,.5,.75,1])for(const drift of [null,.1,.55,.99]){
   writeCarrierPosition(out,0,r,kind,i,{fill:fraction,depletion:fraction,drift});const [x,y,z]=out;
   let inside;
   if(r.style==='flat')inside=(within(x,-3.5,3.5)&&within(y,-.975,-.195)&&within(z,-2.2,2.2))||(within(x,-3,3)&&within(y,-.195,.155)&&within(z,-1.7,1.7));
   else if(r.style==='fin')inside=within(x,-2.9,2.9)&&within(y,-.145,1.705)&&within(z,-.21,.21);
   else inside=within(y,r.y-.09,r.y+.09)&&((within(x,-2.5,2.5)&&within(z,-.9,.9))||((within(x,-3.125,-1.875)||within(x,1.875,3.125))&&within(z,-1.15,1.15)));
   assert.ok(inside,JSON.stringify({r,kind,i,fraction,drift,point:[x,y,z]}));
  }
 }
});
test('pre-existing minority electrons approach the oxide while holes retreat into the P body',async()=>{
 const {writeCarrierPosition}=await load(),r={style:'flat',y:.14},a=new Float32Array(3),b=new Float32Array(3);
 for(let i=0;i<6;i++){writeCarrierPosition(a,0,r,'minority',i,{fill:0,depletion:0,drift:null});writeCarrierPosition(b,0,r,'minority',i,{fill:1,depletion:1,drift:null});assert.ok(b[1]>a[1]);assert.ok(b[1]>.09&&b[1]<.155);}
 for(let i=0;i<32;i++){writeCarrierPosition(a,0,r,'majority',i,{fill:0,depletion:0,drift:null});writeCarrierPosition(b,0,r,'majority',i,{fill:1,depletion:1,drift:null});assert.ok(b[1]<a[1]);}
});

test('all four GPU offset positions stay in silicon, sharing one trajectory per group',async()=>{
 const {writeCarrierPosition,carrierGroupOffsets}=await load(),out=new Float32Array(3);
 const within=(v,a,b)=>v>=a-1e-6&&v<=b+1e-6;
 for(const r of [{style:'flat',y:.14},{style:'fin',y:.8},{style:'sheet',y:.35},{style:'sheet',y:4.96}]){
  const offsets=carrierGroupOffsets(r.style);assert.equal(offsets.length,12);assert.equal(new Set(Array.from({length:4},(_,i)=>Array.from(offsets.slice(i*3,i*3+3)).join(','))).size,4);
  for(const [kind,count] of [['mobile',48],['majority',r.style==='flat'?32:8],['minority',r.style==='flat'?6:3],['ends',24]])for(let i=0;i<count;i++)for(const f of [0,.25,.5,.75,1])for(const drift of [null,0,.1,.9]){
   writeCarrierPosition(out,0,r,kind,i,{fill:f,depletion:f,drift});
   for(let k=0;k<12;k+=3){const x=out[0]+offsets[k],y=out[1]+offsets[k+1],z=out[2]+offsets[k+2];let inside;
    if(r.style==='flat')inside=(within(x,-3.5,3.5)&&within(y,-.975,-.195)&&within(z,-2.2,2.2))||(within(x,-3,3)&&within(y,-.195,.155)&&within(z,-1.7,1.7));
    else if(r.style==='fin')inside=within(x,-2.9,2.9)&&within(y,-.145,1.705)&&within(z,-.21,.21);
    else inside=within(y,r.y-.09,r.y+.09)&&((within(x,-2.5,2.5)&&within(z,-.9,.9))||((within(x,-3.125,-1.875)||within(x,1.875,3.125))&&within(z,-1.15,1.15)));
    assert.ok(inside,JSON.stringify({r,kind,i,f,drift,point:[x,y,z]}));
   }
  }
 }
});
test('low-doped GAA explains electron supply and distinguishes p-channel carriers',async()=>{
 const {deviceLesson}=await load(),n=deviceLesson('n','gaafet'),p=deviceLesson('p','cfet');
 assert.ok(n[1].why.includes('전도 운반자는 전자'));assert.ok(n[2].description.includes('N+'));assert.equal(n[2].source,n[2].drain);assert.ok(n[1].watch.includes('공기 중'));
 assert.ok(p[2].description.includes('정공'));assert.ok(p[2].description.includes('P+'));assert.ok(p[2].gate<p[2].source);
});

const position=(write,r,kind,i,state)=>{const out=new Float32Array(3);write(out,0,r,kind,i,state);return Array.from(out);};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
test('mobile carriers use evenly spaced aligned lanes and preserve cyclic spacing while drifting',async()=>{
 const {writeCarrierPosition}=await load();
 for(const r of [{style:'flat',y:.14},{style:'fin',y:.8},{style:'sheet',y:.35},{style:'sheet',y:4.96}]){
  const span=r.style==='fin'?5.4:5.6,pitch=span/12;
  for(const drift of [null,0,.07,.37,.99]){
   const state={fill:1,depletion:1,drift},points=Array.from({length:48},(_,i)=>position(writeCarrierPosition,r,'mobile',i,state));
   for(let lane=0;lane<4;lane++)for(let col=0;col<12;col++){
    const p=points[lane*12+col],next=points[lane*12+(col+1)%12];near(((next[0]-p[0])%span+span)%span,pitch);
    near(p[0],points[col][0]);near(p[1],points[lane*12][1]);near(p[2],points[lane*12][2]);
   }
   assert.equal(new Set([0,12,24,36].map(i=>points[i].slice(1).join(','))).size,4);
  }
  const start=position(writeCarrierPosition,r,'mobile',4,{fill:1,depletion:1,drift:.10}),later=position(writeCarrierPosition,r,'mobile',4,{fill:1,depletion:1,drift:.11});near(later[0]-start[0],span*.01);near(start[1],later[1]);near(start[2],later[2]);
  const off={fill:0,depletion:0,drift:null};for(let lane=0;lane<4;lane++)for(let col=0;col<12;col++){const p=position(writeCarrierPosition,r,'mobile',lane*12+col,off);near(p[0],position(writeCarrierPosition,r,'mobile',col,off)[0]);assert.ok(Math.abs(p[0])>=2);}
 }
});
test('majority and reservoir clouds remain regular grids without collapsing into two GAA edge clusters',async()=>{
 const {writeCarrierPosition}=await load();
 for(const r of [{style:'flat',y:.14},{style:'fin',y:.8},{style:'sheet',y:.35},{style:'sheet',y:4.96}]){
  const columns=r.style==='flat'?8:4,count=r.style==='flat'?32:8;
  for(const depletion of [0,.25,.5,.75,1]){
   const state={fill:depletion,depletion,drift:null},points=Array.from({length:count},(_,i)=>position(writeCarrierPosition,r,'majority',i,state));
   for(let row=0;row<count/columns;row++)for(let col=0;col<columns;col++){near(points[row*columns+col][0],points[col][0]);near(points[row*columns+col][1],points[row*columns][1]);near(points[row*columns+col][2],points[row*columns][2]);}
   assert.equal(new Set(points.map(p=>p[0].toFixed(6))).size,columns);
  }
  const state={fill:0,depletion:0,drift:null};for(let side=0;side<2;side++)for(let row=0;row<3;row++)for(let col=0;col<4;col++){
   const p=position(writeCarrierPosition,r,'ends',side*12+row*4+col,state),first=position(writeCarrierPosition,r,'ends',side*12+row*4,state);near(p[1],first[1]);near(p[2],first[2]);if(col)near(Math.abs(p[0]-position(writeCarrierPosition,r,'ends',side*12+row*4+col-1,state)[0]),.25);
  }
 }
});
