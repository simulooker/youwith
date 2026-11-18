const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
let modulePromise;
const state=()=>modulePromise||=(import('../frontend/tech/datapath-state.js'));
test('MIPS examples have independently verifiable 32-bit encodings and exact field boundaries',async()=>{
 const {example,decode,instructionFields}=await state();
 for(const [kind,word,expected] of [['r',0x012a4020,{opcode:0,rs:9,rt:10,rd:8,shamt:0,funct:32}],['lw',0x8e08000c,{opcode:35,rs:16,rt:8,immediate:12}],['beq',0x1109fffd,{opcode:4,rs:8,rt:9,immediate:-3}]]){
  const e=example(kind);assert.equal(e.word,word);for(const [key,value] of Object.entries(expected))assert.equal(decode(word)[key],value);
  const fields=instructionFields(e);assert.equal(fields.map(f=>f.bits).join(''),word.toString(2).padStart(32,'0'));assert.equal(fields.reduce((n,f)=>n+f.width,0),32);
  assert.deepEqual(fields.map(f=>[f.high,f.low]),kind==='r'?[[31,26],[25,21],[20,16],[15,11],[10,6],[5,0]]:[[31,26],[25,21],[20,16],[15,0]]);
 }
});
test('add and lw select different destination fields and sources and commit only at the final clock boundary',async()=>{
 const {example,snapshot}=await state();const add=example('r'),lw=example('lw');
 assert.equal(add.a,5);assert.equal(add.b,7);assert.equal(add.alu,12);assert.equal(add.control.RegDst,1);assert.equal(add.control.MemtoReg,0);
 assert.equal(lw.alu,0x200c);assert.equal(lw.control.RegDst,0);assert.equal(lw.control.MemtoReg,1);assert.equal(lw.control.ALUSrc,1);assert.equal(lw.memory.value,42);
 for(const e of [add,lw]){for(let i=0;i<5;i++){assert.equal(snapshot(e,i).registers[8],3);assert.equal(snapshot(e,i).pc,0x1000);}assert.equal(snapshot(e,5).registers[8],e===add?12:42);assert.equal(snapshot(e,5).pc,0x1004);assert.equal(snapshot(e,5).registers[0],0);assert.equal(e.control.MemWrite,0);}
 assert.equal(snapshot(lw,5).memory.value,42);assert.equal(example('r').registers[8],3);
});
test('beq sign extends a negative word offset, uses PC+4 and Zero and never writes a general register',async()=>{
 const {example,snapshot}=await state();const yes=example('beq',true),no=example('beq',false);
 assert.equal(yes.fields.immediate,-3);assert.equal(yes.shifted,-12);assert.equal(yes.target,0x0ff8);assert.equal(yes.alu,0);assert.equal(yes.zero,1);assert.equal(yes.nextPC,0x0ff8);
 assert.equal(no.alu,5);assert.equal(no.zero,0);assert.equal(no.nextPC,0x1004);
 for(const e of [yes,no]){assert.equal(e.control.Branch,1);assert.equal(e.control.RegWrite,0);assert.equal(e.control.RegDst,'X');assert.equal(e.control.MemtoReg,'X');assert.equal(e.control.MemRead,0);assert.equal(e.control.MemWrite,0);assert.deepEqual(snapshot(e,5).registers,e.registers);}
});
test('every lesson route exists and control outputs stay separate from ALU-derived decisions',async()=>{
 const {example,lesson,SIGNALS}=await state(),source=fs.readFileSync(__dirname+'/../frontend/tech/datapath.js','utf8');
 assert.deepEqual(SIGNALS.map(([name])=>name),['RegDst','ALUSrc','MemtoReg','RegWrite','MemRead','MemWrite','Branch','ALUOp']);
 for(const kind of ['r','lw','beq'])for(let i=0;i<6;i++)for(const id of lesson(example(kind),i).flows)assert.match(source,new RegExp('(?:^|[,\\n ])'+id+':'));
 assert.equal(example('r').aluControl,'0010');assert.equal(example('lw').aluControl,'0010');assert.equal(example('beq').aluControl,'0110');
 const html=fs.readFileSync(__dirname+'/../frontend/tech/datapath.html','utf8');assert.match(html,/단일 사이클/);assert.match(html,/분기 지연 슬롯/);assert.match(html,/fetch\('\/api\/me'/);assert.match(html,/YOUWITH_PUBLIC_PREVIEW/);
});
