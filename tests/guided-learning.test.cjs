const test=require('node:test');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const load=name=>import(pathToFileURL(path.resolve(__dirname,'../frontend/tech',name)).href);
test('saved neural states match the actual solver and end in all four XOR answers',async()=>{
 const {SCENARIOS}=await load('learning-scenarios.js'),{XORNetwork}=await load('neural-math.js'),n=new XORNetwork();
 for(const s of SCENARIOS.network.snapshots){
  if(s.epochs>n.epochs)n.train(s.epochs-n.epochs,.5);
  assert.equal(s.loss,n.loss());assert.deepEqual(s.w1,n.w1);assert.deepEqual(s.gradients,n.gradients());
  for(const row of s.outputs)assert.deepEqual({x:row.x,...n.forward(row.x),y:row.y},{...row});
 }
 const last=SCENARIOS.network.snapshots.at(-1);assert.ok(last.loss<.02);
 for(const row of last.outputs)assert.equal(row.output>=.5?1:0,row.y);
});
test('saved CART cases show the same fruit wrong at depth 1 and correct at depth 2',async()=>{
 const {SCENARIOS}=await load('learning-scenarios.js'),{buildTree,predictTree}=await load('decision-tree-math.js'),d=SCENARIOS.tree;
 for(const s of d.snapshots){assert.deepEqual(s.tree,buildTree(d.data,s.depth));assert.deepEqual(s.result,predictTree(s.tree,d.input));}
 assert.equal(d.snapshots[1].result.prediction,1);assert.equal(d.snapshots[2].result.prediction,d.target);
 assert.equal(d.snapshots[1].correct,9);assert.equal(d.snapshots[2].correct,10);assert.equal(d.snapshots[2].impurity,0);
 for(const c of d.cases)for(const stage of c.stages)assert.ok(stage.snapshot<d.snapshots.length);
});
test('gate states are complementary in CFET, and P/N doping remains separate from mobile density',async()=>{
 const {gateState,partInfo}=await load('device-state.js');
 for(const device of ['mosfet','finfet','gaafet','cfet']){
  const low=gateState(device,false),high=gateState(device,true);assert.equal(low.n.on,false);assert.equal(high.n.on,true);assert.ok(high.n.density>low.n.density);
  if(device==='cfet'){assert.equal(low.p.on,true);assert.equal(high.p.on,false);assert.equal(low.p.carrier,'정공');}
  else assert.equal(low.p,null);
  assert.match(partInfo(device,'oxide').density,/절연체/);assert.match(partInfo(device,'gate').density,/금속/);
 }
 assert.match(partInfo('mosfet','body').density,/P형/);assert.match(partInfo('cfet','source','p').density,/P\+/);
});
test('browser learning modules never import or invoke the training solvers',()=>{
 const fs=require('node:fs');for(const file of ['neural-network.js','decision-tree.js']){
  const code=fs.readFileSync(path.resolve(__dirname,'../frontend/tech',file),'utf8');assert.doesNotMatch(code,/neural-math|decision-tree-math|\.train\(|buildTree\(|predictTree\(/);assert.match(code,/learning-scenarios/);
 }
});
