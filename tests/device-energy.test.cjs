const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const load=()=>import(pathToFileURL(path.resolve(__dirname,'../frontend/tech/device-energy.js')).href);
test('gate lowers the source-referenced barrier and OFF restores it despite retained drain bias',async()=>{
 const {energyProfile}=await load();for(const polarity of ['n','p']){
  const states=Array.from({length:5},(_,i)=>energyProfile(i,polarity));
  for(const s of states){assert.equal(s.values[0],0);assert.ok(s.values.every(Number.isFinite));assert.equal(s.values.length,65);}
  assert.ok(states[0].peak>states[1].peak&&states[1].peak>states[2].peak);
  assert.ok(Math.abs(states[2].values.at(-1))<1e-12);assert.ok(states[3].values.at(-1)<0);
  assert.equal(states[4].values.at(-1),states[3].values.at(-1));assert.ok(states[4].peak>states[3].peak+.5);
 }
});
test('nFET uses Ec and pFET uses minus-Ev so both carrier energies fall toward their forward-biased drain',async()=>{
 const {energyProfile}=await load(),n=energyProfile(3,'n'),p=energyProfile(3,'p');
 assert.ok(n.kind.includes('E_c'));assert.ok(p.kind.includes('−E_v'));assert.deepEqual(n.values,p.values);assert.ok(p.values.at(-1)<p.values[0]);
 assert.ok(energyProfile(2).explanation.includes('순전류는 없어요'));assert.ok(energyProfile(4).explanation.includes('누설'));
});
