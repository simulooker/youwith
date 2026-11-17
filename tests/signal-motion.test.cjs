const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const load=file=>import(pathToFileURL(path.resolve(__dirname,'../frontend/tech',file)).href);
const near=(a,b,tolerance=1e-6)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} != ${b}`);
const xyz=(time,values)=>Float32Array.from(time.flatMap((x,i)=>[x,values[i],0]));

test('signal split/merge moves existing vertices between the true sum and each component',async()=>{
  const {writeSignalPositions}=await load('signal-motion.js');
  const time=[-1,0,1],merged=xyz(time,[3,1,-2]),component=xyz(time,[1,-1,.5]),target=new Float32Array(merged.length);
  assert.equal(writeSignalPositions(target,merged,component,0,4,.5),target);
  assert.deepEqual(target,merged);
  writeSignalPositions(target,merged,component,1,4,.5);
  for(let i=0;i<time.length;i++){near(target[i*3],time[i]);near(target[i*3+1],component[i*3+1]+4);near(target[i*3+2],.5);}
  writeSignalPositions(target,merged,component,.5,4,.5);
  for(let i=0;i<time.length;i++){near(target[i*3],time[i]);near(target[i*3+1],(merged[i*3+1]+component[i*3+1])/2+2);near(target[i*3+2],.25);}
  const midpoint=target.slice();
  for(const spread of [.8,1,.8,.5])writeSignalPositions(target,merged,component,spread,4,.5);
  assert.deepEqual(target,midpoint);
  writeSignalPositions(target,merged,component,-1,4,.5);assert.deepEqual(target,merged);
  writeSignalPositions(target,merged,component,2,4,.5);
  for(let i=0;i<time.length;i++)near(target[i*3+1],component[i*3+1]+4);
  assert.ok([...target].every(Number.isFinite));
  assert.throws(()=>writeSignalPositions(new Float32Array(3),merged,component,0),RangeError);
  assert.throws(()=>writeSignalPositions(target,merged,component,NaN),RangeError);
});

test('saved component curves all coincide at their computed sum without inventing an exact FT pulse',async()=>{
  const {writeSignalPositions}=await load('signal-motion.js'),{COMPONENTS}=await load('signal-components.js');
  for(const d of COMPONENTS){
    const merged=xyz(d.time,d.sum),target=new Float32Array(merged.length);
    for(let k=0;k<d.parts.length;k++){
      const component=xyz(d.time,d.parts[k].values),offset=k*2,depth=k*.3;
      writeSignalPositions(target,merged,component,0,offset,depth);assert.deepEqual(target,merged);
      writeSignalPositions(target,merged,component,1,offset,depth);
      for(let i=0;i<d.time.length;i++){near(target[i*3],d.time[i]);near(target[i*3+1],d.parts[k].values[i]+offset);near(target[i*3+2],depth);}
    }
    if(d.exact)for(let i=0;i<d.time.length;i++)near(d.sum[i],d.input[i]);
    else{assert.equal(d.id,'ft');assert.ok(d.sum.some((value,i)=>Math.abs(value-d.input[i])>.05));}
  }
});

test('only the active or already-completed split/merge action is disabled',async()=>{
  const {signalButtonState}=await load('signal-motion.js');
  assert.deepEqual(signalButtonState(0),{splitDisabled:false,joinDisabled:true});
  assert.deepEqual(signalButtonState(1),{splitDisabled:true,joinDisabled:false});
  assert.deepEqual(signalButtonState(.4),{splitDisabled:false,joinDisabled:false});
  for(const spread of [0,.4,1]){
    assert.deepEqual(signalButtonState(spread,1),{splitDisabled:true,joinDisabled:false});
    assert.deepEqual(signalButtonState(spread,0),{splitDisabled:false,joinDisabled:true});
  }
});
