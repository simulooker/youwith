const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const load=file=>import(pathToFileURL(path.resolve(__dirname,'../frontend/tech',file)).href),near=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);

test('signed velocity partitions approach displacement rather than total travel distance',async()=>{
  const {velocity,displacement,distance,displacementPartition}=await load('integration-math.js');
  near(velocity(0),2);near(velocity(2),0);near(velocity(3),-1);near(displacement(2),2);near(displacement(3),1.5);near(distance(3),2.5);
  for(const [n,expected] of [[4,2.625],[12,1.875],[48,1.59375]]){
    const level=displacementPartition(n);near(level.sum,expected);assert.equal(level.parts.length,n);assert.ok(level.positive>0&&level.negative<0);near(level.parts.reduce((s,p)=>s+p.measure,0),3);
    for(const p of level.parts){near(p.value,velocity(p.sample[0]));near(p.contribution,p.value*p.measure);near(p.size[1],Math.abs(p.value));near(p.center[1],p.value/2);}
  }
});

test('height-area and density-volume units produce different weighted physical quantities',async()=>{
  const {height,density,volumePartition,massPartition}=await load('integration-math.js');
  for(const [n,expected] of [[2,5],[4,5.5],[8,5.75]]){
    const l=volumePartition(n);near(l.sum,expected);assert.equal(l.parts.length,n*n);near(l.parts.reduce((s,p)=>s+p.measure,0),4);
    for(const p of l.parts){near(p.value,height(...p.sample));near(p.measure,p.size[0]*p.size[1]);near(p.contribution,p.size[0]*p.size[1]*p.size[2]);}
  }
  for(const [n,expected] of [[2,1.25],[4,1.375],[6,17/12]]){
    const l=massPartition(n);near(l.sum,expected);assert.equal(l.parts.length,n*n*n);near(l.parts.reduce((s,p)=>s+p.measure,0),1);
    for(const p of l.parts){near(p.value,density(p.sample[0]));near(p.measure,p.size[0]*p.size[1]*p.size[2]);near(p.contribution,p.value*p.measure);}
  }
});

test('oriented surface flux uses a unit normal and changes sign when the normal reverses',async()=>{
  const {fluxOrientation,fluxPartition}=await load('integration-math.js');
  for(const [degrees,expected] of [[0,8],[60,4],[90,0],[180,-8]]){
    const o=fluxOrientation(degrees);near(Math.hypot(...o.normal),1);near(Math.hypot(...o.basis.u),1);near(o.flux,expected);
    const u=o.basis.u,v=o.basis.v,cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    cross.forEach((value,i)=>near(value,o.normal[i]));
    for(const n of [2,4,8]){
      const l=fluxPartition(n,degrees);near(l.sum,expected);near(l.error,0);near(l.parts.reduce((s,p)=>s+p.measure,0),4);
      for(const p of l.parts){near(p.center.reduce((sum,x,i)=>sum+x*o.normal[i],0),0);near(p.contribution,p.value*p.measure);}
    }
  }
});

test('saved integration data reproduces the authoring calculations without importing runtime solvers',async()=>{
  const {INTEGRATION_CASES}=await load('integration-scenarios.js'),math=await load('integration-math.js');
  assert.deepEqual(INTEGRATION_CASES.map(c=>c.id),['displacement','volume','flux','mass']);
  for(const c of INTEGRATION_CASES){
    assert.equal(c.steps.length,4);assert.deepEqual(c.steps.map(s=>s.level),[null,0,1,2]);
    for(const l of c.levels){let cumulative=0;for(const p of l.parts){cumulative+=p.contribution;near(p.cumulative,cumulative);assert.ok([...p.center,...p.size,...p.sample,p.value,p.measure,p.contribution].every(Number.isFinite));}near(l.sum,cumulative);near(l.error,Math.abs(l.sum-c.exact));}
    const fn={displacement:math.displacementPartition,volume:math.volumePartition,mass:math.massPartition,flux:math.fluxPartition}[c.id];for(const l of c.levels)assert.deepEqual(l,fn(l.resolution));
  }
  const d=INTEGRATION_CASES[0];assert.equal(d.samples.length,61);near(d.samples.at(-1).accumulated,d.exact);near(d.samples.at(-1).distance,d.totalDistance);
  const flux=INTEGRATION_CASES[2];for(const o of flux.orientations)for(const l of o.levels)assert.deepEqual(l,math.fluxPartition(l.resolution,o.degrees));
});
