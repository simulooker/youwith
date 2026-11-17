const test=require('node:test'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const load=file=>import(pathToFileURL(__dirname+'/../frontend/tech/'+file).href);
test('XOR analytic gradients match independent finite differences for all 17 parameters',async()=>{
 const {XORNetwork}=await load('neural-math.js'),n=new XORNetwork(),g=n.gradients(),epsilon=1e-5;
 const parameters=[];for(let j=0;j<4;j++){for(let k=0;k<2;k++)parameters.push([()=>n.w1[j][k],v=>n.w1[j][k]=v,g.w1[j][k]]);parameters.push([()=>n.b1[j],v=>n.b1[j]=v,g.b1[j]],[()=>n.w2[j],v=>n.w2[j]=v,g.w2[j]]);}parameters.push([()=>n.b2,v=>n.b2=v,g.b2]);
 for(const [get,set,analytic] of parameters){const old=get();set(old+epsilon);const plus=n.loss();set(old-epsilon);const minus=n.loss();set(old);assert.ok(Math.abs((plus-minus)/(2*epsilon)-analytic)<1e-7);}
});
test('Real XOR training lowers loss and learns every truth-table row',async()=>{
 const {XORNetwork,XOR_DATA}=await load('neural-math.js'),n=new XORNetwork(),before=n.loss();n.train(4000,.5);assert.ok(n.loss()<.02,`loss=${n.loss()}`);assert.ok(n.loss()<before);assert.equal(n.epochs,4000);for(const row of XOR_DATA)assert.equal(n.forward(row.x).output>=.5?1:0,row.y);
 n.b2=1000;assert.ok(Number.isFinite(n.loss()));n.b2=-1000;assert.ok(Number.isFinite(n.loss()));assert.throws(()=>n.train(0));assert.throws(()=>n.train(1,NaN));
});
test('CART weighted split, deterministic equality routing, depth limits and real predictions',async()=>{
 const {FRUIT_DATA,gini,bestSplit,buildTree,predictTree}=await load('decision-tree-math.js'),before=JSON.stringify(FRUIT_DATA),split=bestSplit(FRUIT_DATA),tree=buildTree(FRUIT_DATA,3);
 assert.equal(gini(FRUIT_DATA),.5);assert.equal(split.left.length+split.right.length,10);
 assert.ok(Math.abs(split.gain-(gini(FRUIT_DATA)-(split.left.length*gini(split.left)+split.right.length*gini(split.right))/10))<1e-10);
 assert.equal(buildTree(FRUIT_DATA,0).feature,null);assert.notEqual(tree.feature,null);for(const row of FRUIT_DATA)assert.equal(predictTree(tree,row.x).prediction,row.y);
 const equality=[0,0];equality[tree.feature]=tree.threshold;assert.equal(predictTree(tree,equality).path[1],tree.left.id);assert.equal(JSON.stringify(FRUIT_DATA),before);assert.throws(()=>buildTree([],3));assert.throws(()=>buildTree(FRUIT_DATA,8));assert.throws(()=>predictTree(tree,[NaN,7]));
});
