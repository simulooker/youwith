const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function context(){const store=new Map(),c=vm.createContext({localStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)},document:{addEventListener(){},querySelector(){return null;},documentElement:{dataset:{}}},matchMedia:()=>({matches:true}),setTimeout,clearTimeout});vm.runInContext(fs.readFileSync(__dirname+'/../frontend/game2048.js','utf8'),c);return c;}
const run=(c,source)=>vm.runInContext(source,c),json=(c,source)=>JSON.parse(run(c,'JSON.stringify('+source+')'));
test('2048 merges each tile once in edge order and adds only newly merged values to score',()=>{
 const c=context();for(const [row,expected,score] of [[[2,2,2,2],[4,4,0,0],8],[[2,2,4,0],[4,4,0,0],4],[[4,4,4,0],[8,4,0,0],8],[[0,2,0,2],[4,0,0,0],4]]){
  c.input=[...row,...Array(12).fill(0)];const result=json(c,"game2048Slide(input,'left')");assert.deepEqual(result.board.slice(0,4),expected);assert.equal(result.score,score);assert.deepEqual(c.input.slice(0,4),row);
 }
});
test('2048 uses direction-specific edge order for right, up and down without row wrapping',()=>{
 const c=context();assert.deepEqual(json(c,"game2048Slide([2,2,4,0,...Array(12).fill(0)],'right').board.slice(0,4)"),[0,0,4,4]);
 c.input=[2,0,0,0,2,0,0,0,4,0,0,0,0,0,0,0];assert.deepEqual(json(c,"game2048Slide(input,'up').board.filter((_,i)=>i%4===0)"),[4,4,0,0]);assert.deepEqual(json(c,"game2048Slide(input,'down').board.filter((_,i)=>i%4===0)"),[0,0,4,4]);
 assert.equal(run(c,"game2048CanMove([2,4,8,16,4,8,16,2,8,16,2,4,16,2,4,8])"),false);assert.equal(run(c,"game2048CanMove([2,4,8,16,4,8,16,2,8,16,2,4,16,2,8,8])"),true);
});
test('2048 spawns into empty cells only and invalid moves do not spawn or change score',()=>{
 const c=context();assert.deepEqual(json(c,'game2048Spawn(Array(16).fill(0),()=>0)'),{board:[2,...Array(15).fill(0)],index:0});assert.equal(run(c,'game2048Spawn(Array(16).fill(0),()=>.99).board[15]'),4);assert.equal(run(c,'game2048Spawn(Array(16).fill(2)).index'),-1);
 run(c,"Object.assign(game2048,{started:true,board:[2,4,8,16,...Array(12).fill(0)]});const original=JSON.stringify(game2048.board);game2048Move('left')");assert.equal(run(c,'JSON.stringify(game2048.board)===original'),true);assert.equal(run(c,'game2048.score'),0);
 run(c,"game2048Move('down')");assert.equal(run(c,'game2048.board.filter(Boolean).length'),5);
});
test('2048 pauses on winning, allows continuing, preserves best and resets the round cleanly',()=>{
 const c=context();run(c,"Math.random=()=>0;Object.assign(game2048,{started:true,board:[1024,1024,...Array(14).fill(0)]});game2048Move('left')");assert.equal(run(c,'game2048.won'),true);assert.equal(run(c,'game2048.score'),2048);assert.equal(run(c,"localStorage.getItem('youwith.2048.best')"),'2048');
 run(c,"const wonBoard=JSON.stringify(game2048.board);game2048Move('down')");assert.equal(run(c,'JSON.stringify(game2048.board)===wonBoard'),true);run(c,"game2048Continue();game2048Move('down')");assert.equal(run(c,'game2048.continued'),true);assert.equal(run(c,'game2048.board[12]'),2048);
 run(c,'game2048Create()');assert.equal(run(c,'game2048.board.filter(Boolean).length'),2);assert.equal(run(c,'game2048.score'),0);assert.equal(run(c,'game2048.best'),2048);assert.equal(run(c,'game2048.won'),false);
});
test('2048 storage failures leave gameplay usable and leaving a page can settle movement',()=>{
 const c=context();run(c,"localStorage.setItem=()=>{throw Error('blocked')};Object.assign(game2048,{started:true,board:[2,2,...Array(14).fill(0)]});game2048Move('left')");assert.equal(run(c,'game2048.score'),4);assert.equal(run(c,'game2048.storage'),false);run(c,'game2048.moving=true;game2048StopMotion()');assert.equal(run(c,'game2048.moving'),false);
});
