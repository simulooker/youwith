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
 for(const e of [yes,no]){assert.equal(e.control.Branch,1);assert.equal(e.control.RegWrite,0);assert.equal(e.control.RegDst,'X');assert.equal(e.control.MemtoReg,'X');assert.equal(e.control.MemRead,0);assert.equal(e.control.MemWrite,0);assert.equal(e.control.Jump,0);assert.deepEqual(snapshot(e,5).registers,e.registers);}
});
test('every lesson route exists and control outputs stay separate from ALU-derived decisions',async()=>{
 const {example,lesson,SIGNALS}=await state(),source=fs.readFileSync(__dirname+'/../frontend/tech/datapath-reference.js','utf8');
 assert.deepEqual(SIGNALS.map(([name])=>name),['RegDst','Jump','Branch','MemRead','MemtoReg','ALUOp','MemWrite','ALUSrc','RegWrite']);
 for(const kind of ['r','lw','beq'])for(let i=0;i<6;i++)for(const id of lesson(example(kind),i).flows)assert.match(source,new RegExp('(?:^|[,\\n ])'+id+':'));
 assert.equal(example('r').aluControl,'0010');assert.equal(example('lw').aluControl,'0010');assert.equal(example('beq').aluControl,'0110');
 const html=fs.readFileSync(__dirname+'/../frontend/tech/datapath.html','utf8');assert.match(html,/단일 사이클/);assert.match(html,/분기 지연 슬롯/);assert.match(html,/fetch\('\/api\/me'/);assert.match(html,/YOUWITH_PUBLIC_PREVIEW/);
});

test('all three instructions return through both branch and Jump selection, with Jump disabled',async()=>{
 const {example,lesson}=await state();
 for(const kind of ['r','lw','beq'])for(const equal of [true,false]){
  const e=example(kind,equal),last=lesson(e,5);
  assert.equal(e.control.Jump,0);assert.ok(last.nodes.includes('jumpmux'));
  assert.ok(last.flows.indexOf('jumpPass')>=0);assert.ok(last.flows.indexOf('jumpPass')<last.flows.indexOf('pcReturn'));
  assert.equal(e.nextPC,kind==='beq'&&equal?0x0ff8:0x1004);
 }
});

test('control table has exactly eight groups with a single two-bit ALUOp; related data paths stay together',async()=>{
 const {CONTROL_ROWS,pathGroups,stepRows}=await import('../frontend/tech/datapath-guidance.js');
 const {example}=await state();assert.equal(CONTROL_ROWS.length,8);assert.equal(CONTROL_ROWS.find(([n])=>n==='ALUOp')[1],2);assert.ok(!CONTROL_ROWS.some(([n])=>n==='Jump'));
 for(const kind of ['r','lw','beq']){const e=example(kind),data=pathGroups(e).find(g=>g.id==='data'),ids=data.streams.map(s=>s.id);assert.ok(ids.includes('rs'));assert.ok(ids.includes('readA'));assert.ok(ids.includes('muxB'));if(kind!=='lw'){assert.ok(ids.includes('rt'));assert.ok(ids.includes('readB'));}if(kind==='r'){assert.ok(ids.includes('rd'));assert.ok(ids.includes('destWrite'));assert.ok(ids.includes('writeback'));}if(kind==='lw'){assert.ok(ids.includes('memoryOut'));assert.ok(ids.includes('rtDest'));}if(kind==='beq'){assert.ok(ids.includes('zero'));assert.ok(ids.includes('branchOffset'));assert.ok(ids.includes('pcReturn'));}
  for(const stream of data.streams)assert.ok(stream.end>stream.start&&stream.start>=0&&stream.end<=1);
  for(let i=0;i<6;i++)assert.ok(stepRows(e,i).every(row=>row.length===2&&String(row[1]).length));
 }
});
test('original-image overlay includes all register and memory port meanings and distinct source-correct enable wires',async()=>{
 const {ROUTES,REFERENCE}=await import('../frontend/tech/datapath-reference.js'),{PORT_MEANINGS}=await import('../frontend/tech/datapath-guidance.js');
 assert.equal(REFERENCE.image,'datapath-reference.png');assert.deepEqual(ROUTES.fetch,[[110,563],[140,563]]);
 assert.deepEqual(ROUTES.ctrlMemRead.at(-1),[943,789]);assert.deepEqual(ROUTES.ctrlMemWrite.at(-1),[943,595]);
 assert.deepEqual(PORT_MEANINGS.regs.map(([p])=>p),['Read register 1','Read register 2','Write register','Write data','Read data 1','Read data 2']);
 assert.deepEqual(PORT_MEANINGS.mem.map(([p])=>p),['Address','Write data','Read data']);
});
