// Small, deterministic MIPS teaching examples. Each example starts independently.
export const hex=n=>'0x'+(n>>>0).toString(16).toUpperCase().padStart(8,'0');
export const binary=(n,width)=>(n>>>0).toString(2).slice(-width).padStart(width,'0');
export function decode(word){return {opcode:word>>>26,rs:(word>>>21)&31,rt:(word>>>16)&31,rd:(word>>>11)&31,shamt:(word>>>6)&31,funct:word&63,immediate:(word<<16)>>16};}
export const REGISTER_NAMES={0:'$zero',8:'$t0',9:'$t1',10:'$t2',16:'$s0'};
export const SIGNALS=[
 ['RegDst','regdst','목적 레지스터 번호 선택','0: rt · 1: rd'],
 ['Jump','jumpmux','최종 다음 PC 선택','0: Branch MUX 출력 · 1: Jump 주소 · 현재 예제는 모두 0'],
 ['Branch','branch','조건 분기 명령 표시','PCSrc = Branch AND Zero'],
 ['MemRead','mem','데이터 메모리 읽기 허용','1이면 ALU가 만든 주소에서 32비트 읽기'],
 ['MemtoReg','wb','레지스터에 기록할 데이터 선택','0: ALU 결과 · 1: 메모리 읽기값'],
 ['ALUOp','aluctrl','ALU Decoder의 명령 분류','00: ADD · 01: SUB · 10: funct 해독'],
 ['MemWrite','mem','데이터 메모리 쓰기 허용','세 예제 모두 0 · 메모리에 쓰지 않음'],
 ['ALUSrc','alusrc','ALU의 두 번째 피연산자 선택','0: Read data 2 · 1: 부호 확장 immediate'],
 ['RegWrite','regs','Register File 쓰기 허용','1일 때 클록 경계에서 선택 레지스터에 기록']
];
const control={r:{RegDst:1,Jump:0,ALUSrc:0,MemtoReg:0,RegWrite:1,MemRead:0,MemWrite:0,Branch:0,ALUOp:'10'},lw:{RegDst:0,Jump:0,ALUSrc:1,MemtoReg:1,RegWrite:1,MemRead:1,MemWrite:0,Branch:0,ALUOp:'00'},beq:{RegDst:'X',Jump:0,ALUSrc:0,MemtoReg:'X',RegWrite:0,MemRead:0,MemWrite:0,Branch:1,ALUOp:'01'}};
export const STAGES=['명령어 읽기','비트 분해·제어','레지스터 읽기','ALU 계산','메모리·분기','기록·다음 PC'];
export function example(kind='r',equal=true){
 const word=kind==='r'?0x012a4020:kind==='lw'?0x8e08000c:0x1109fffd,fields=decode(word),pc=0x1000,registers={0:0,8:kind==='beq'?12:3,9:kind==='beq'?(equal?12:7):5,10:7,16:0x2000};
 const a=registers[fields.rs],b=kind==='lw'?fields.immediate:registers[fields.rt],alu=(kind==='beq'?a-b:a+b)|0,zero=Number(alu===0),branch=kind==='beq'&&!!zero,pc4=pc+4,shifted=fields.immediate<<2,target=(pc4+shifted)>>>0,destination=kind==='r'?fields.rd:kind==='lw'?fields.rt:null,value=kind==='lw'?42:alu;
 const assembly=kind==='r'?'add $t0, $t1, $t2':kind==='lw'?'lw $t0, 12($s0)':'beq $t0, $t1, -3';
 return {kind,equal,word,fields,pc,pc4,registers,a,b,alu,zero,branch,shifted,target,destination,value,nextPC:branch?target:pc4,assembly,control:control[kind],aluControl:kind==='beq'?'0110':'0010',memory:kind==='lw'?{address:alu,value:42}:null};
}
export function instructionFields(e){
 const specs=e.kind==='r'?[['opcode',31,26],['rs',25,21],['rt',20,16],['rd',15,11],['shamt',10,6],['funct',5,0]]:[['opcode',31,26],['rs',25,21],['rt',20,16],['immediate',15,0]];
 return specs.map(([name,high,low])=>{const width=high-low+1,raw=(e.word>>>low)&(2**width-1);return {name,high,low,width,raw,bits:binary(raw,width)};});
}
export function fieldMeaning(e,name){
 const f=e.fields;
 if(name==='opcode')return `${binary(f.opcode,6)} → Main Control에서 ${e.kind==='r'?'R-format':e.kind} 해독. ALUOp와 MUX 선택·쓰기 허용 신호를 만듭니다.`;
 if(name==='rs')return `${binary(f.rs,5)}는 값 ${f.rs}이 아니라 레지스터 번호 ${f.rs}(${REGISTER_NAMES[f.rs]})입니다. Register File의 Read register 1로 가고, 해당 레지스터의 32비트 값 ${e.a}를 읽습니다.`;
 if(name==='rt')return `${binary(f.rt,5)} → 번호 ${f.rt}(${REGISTER_NAMES[f.rt]}). ${e.kind==='lw'?'RegDst=0이므로 기록할 목적지입니다. 두 번째 읽기 포트의 값은 사용하지 않습니다.':`Read register 2를 선택하여 32비트 값 ${e.registers[f.rt]}를 읽습니다.`}`;
 if(name==='rd')return `${binary(f.rd,5)} → 번호 ${f.rd}(${REGISTER_NAMES[f.rd]}). RegDst=1이 이 5비트를 선택해 기록할 레지스터를 정합니다.`;
 if(name==='shamt')return '5비트 시프트 양입니다. 이 add 예제에서는 00000이며 사용하지 않습니다. add의 두 피연산자는 rs와 rt에서 읽습니다.';
 if(name==='funct')return '100000 → add. ALUOp=10과 함께 ALU Decoder로 들어가 ALUControl=0010(ADD)을 만듭니다. Main Control은 funct가 아닌 opcode를 읽습니다.';
 return e.kind==='lw'?'16비트 0000000000001100(+12)을 32비트로 부호 확장합니다. 바이트 offset이므로 <<2 없이 base 주소에 더합니다.':'16비트 1111111111111101(-3)의 최상위 비트 1을 복제하여 0xFFFFFFFD로 확장합니다. 그 뒤 <<2로 -12바이트가 되어 PC+4에 더해집니다.';
}
export function snapshot(e,step){return {pc:step===5?e.nextPC:e.pc,registers:{...e.registers,...(step===5&&e.destination!==null?{[e.destination]:e.value}:{})},memory:e.memory?{address:e.memory.address,value:42}:null};}
export function lesson(e,step){
 const k=e.kind,r=k==='r',load=k==='lw',branch=k==='beq',f=e.fields;
 const common=[
 {title:'PC가 명령어의 주소를 보냅니다',why:`PC ${hex(e.pc)}가 Instruction Memory로 들어가 ${hex(e.word)}를 읽습니다. 동시에 별도 가산기가 PC+4=${hex(e.pc4)}를 만듭니다.`,watch:'하늘색은 데이터, 금색 점선은 제어 신호입니다. PC는 바이트 주소이고 32비트 명령어 한 개는 4바이트입니다.',flows:['fetch','pc4','constant4'],nodes:['pc','imem','plus4'],calc:`Instruction = ${hex(e.word)} · PC + 4 = ${hex(e.pc4)}`},
 {title:'하나의 32비트를 용도별 배선으로 나눕니다',why:r?'opcode·rs·rt·rd·shamt·funct의 여섯 필드로 나뉩니다. opcode는 Main Control로, funct는 ALU Decoder로 갑니다. 비트를 삭제하거나 순서대로 소비하지 않고 배선이 동시에 가져갑니다.':'I-format은 opcode·rs·rt·immediate의 네 필드입니다. 하위 16비트 전체가 immediate이며 rd·shamt·funct로 나누지 않습니다. opcode가 Main Control의 출력을 결정합니다.',watch:'아래 비트 필드를 누르면 해당 비트의 도착지와 의미가 나타납니다. 5비트 레지스터 번호와 실제 32비트 데이터는 다릅니다.',flows:['opcode','rs','rt',r?'rd':'imm',r?'funct':'rtDest',...SIGNALS.map(([s])=>'ctrl'+s)],nodes:['imem','control','regs','regdst',r?'aluctrl':'extend'],calc:r?'6 + 5 + 5 + 5 + 5 + 6 = 32 bits':'6 + 5 + 5 + 16 = 32 bits'},
 {title:load?'base 레지스터와 offset을 준비합니다':'선택한 두 레지스터의 값을 읽습니다',why:load?`${REGISTER_NAMES[f.rs]}(번호 ${f.rs})에서 ${hex(e.a)}를 읽습니다. immediate +12는 부호를 유지한 32비트 값이 되고 ALUSrc=1이 이를 ALU B 입력으로 선택합니다.`:`${REGISTER_NAMES[f.rs]}(번호 ${f.rs}) = ${e.a}, ${REGISTER_NAMES[f.rt]}(번호 ${f.rt}) = ${e.b}. 두 읽기 포트가 32비트 값을 내보냅니다. ALUSrc=0은 두 번째 레지스터 값을 선택합니다.`,watch:load?'rt는 이번 명령어의 기록 목적지입니다. 읽기 포트 2의 기존 $t0 값은 주소 계산에 사용하지 않습니다.':'레지스터 번호가 피연산자로 더해지는 것이 아닙니다. 번호로 찾아 읽은 데이터가 ALU 입력입니다.',flows:['readA',load?'imm':'readB',...(load?['extB']:[]),'muxB'],nodes:['regs','alusrc','alu',...(load?['extend']:[])],calc:`ALU A = ${load?hex(e.a):e.a} · ALU B = ${e.b}`},
 {title:branch?'ALU가 두 값의 차이로 같은지 검사합니다':load?'base + byte offset으로 주소를 만듭니다':'ALU가 두 레지스터 값을 더합니다',why:branch?`${e.a} − ${e.b} = ${e.alu}. 결과가 0이면 Zero=1, 아니면 Zero=0입니다. ALU Decoder는 ALUOp=01에 대해 SUB(0110)를 선택합니다. 분기 목적지는 이 뺄셈 결과가 아닌 별도의 가산기에서 계산합니다.`:`ALUControl=0010(ADD). ${load?`${hex(e.a)} + 12 = ${hex(e.alu)}. 이것은 데이터가 아니라 메모리 주소입니다.`:`${e.a} + ${e.b} = ${e.alu}. 이 값이 기록할 결과입니다.`}`,watch:branch?'Branch=1이어도 Zero=0이면 분기하지 않습니다. Zero는 Main Control의 출력이 아닌 ALU의 결과입니다.':r?'ALUOp=10 → funct=100000 → ADD. Data Memory는 읽거나 쓰지 않습니다.':'lw에서는 부호 확장한 offset을 2비트 시프트하지 않습니다.',flows:['readA',load?'extB':'readB','muxB','aluDecode','ctrlALUOp',...(r?['funct']:[]),...(branch?['zero']:[])],nodes:['regs','alusrc','alu','aluctrl',...(branch?['branch']:[])],calc:branch?`Zero = ${e.zero} · PCSrc = Branch(1) AND Zero(${e.zero}) = ${Number(e.branch)}`:`${load?hex(e.a):e.a} + ${e.b} = ${load?hex(e.alu):e.alu}`},
 {title:load?'계산한 주소에서 32비트 데이터를 읽습니다':branch?'분기 목적지와 다음 PC를 고릅니다':'ALU 결과가 메모리를 우회합니다',why:load?`MemRead=1, MemWrite=0. Data Memory의 주소 ${hex(e.alu)}에는 이 예제에서 값 42가 저장되어 있습니다. MemtoReg=1이 42를 기록 데이터로 선택합니다.`:branch?`SignExt(-3)=${hex(f.immediate)} → <<2 = -12. 별도 가산기의 ${hex(e.pc4)} + (-12) = ${hex(e.target)}. PCSrc=${Number(e.branch)}이므로 ${e.branch?'분기 목적지':'PC+4'}를 선택합니다.`:'MemRead=0, MemWrite=0이므로 데이터 메모리는 사용하지 않습니다. MemtoReg=0이 ALU 결과 12를 선택합니다.',watch:branch?'beq는 메모리를 읽거나 레지스터에 기록하지 않습니다. 목적지 계산은 비교와 병렬로 진행되지만 여기서는 이해하기 위해 나누어 보여줍니다.':'MemtoReg MUX가 레지스터에 돌아갈 값의 출처를 정합니다. 실제 쓰기는 아직 일어나지 않았습니다.',flows:load?['address','memoryOut','loadWB','ctrlMemRead','ctrlMemtoReg']:branch?['imm','shift','branchOffset','branchBase','zero','branchSelect',e.branch?'takeBranch':'sequential']:['aluBypass','aluWB','ctrlMemtoReg'],nodes:load?['alu','mem','wb']:branch?['extend','shift','target','branch','nextpc']:['alu','wb'],calc:load?`${hex(e.alu)} → Memory[주소] = 42`:branch?`다음 PC 입력 = ${hex(e.nextPC)}`:'Write data 입력 = 12'},
 {title:branch?'클록 경계에서 PC만 바뀝니다':'클록 경계에서 결과를 기록합니다',why:branch?`RegWrite=0이므로 모든 범용 레지스터는 그대로입니다. PC만 ${hex(e.pc)} → ${hex(e.nextPC)}로 바뀝니다. ${e.branch?'두 레지스터 값이 같아 이전 주소의 명령어로 분기합니다.':'두 값이 달라 순서대로 다음 명령어로 갑니다.'}`:`RegDst=${e.control.RegDst}가 ${r?'rd':'rt'}의 번호 8($t0)을 선택합니다. RegWrite=1이므로 $t0 ← ${e.value}. PC도 ${hex(e.pc)} → ${hex(e.nextPC)}로 갱신됩니다.`,watch:'화면의 단계는 한 명령어의 단일 사이클 내부 신호 흐름을 풀어쓴 순서입니다. 여섯 클록이나 파이프라인의 여섯 단계라는 뜻이 아닙니다.',flows:branch?[e.branch?'takeBranch':'sequential','jumpPass','pcReturn']:[r?'rd':'rtDest','destWrite','writeback','ctrlRegDst','ctrlRegWrite','sequential','jumpPass','pcReturn'],nodes:branch?['pc','nextpc','jumpmux']:['regdst','wb','regs','pc','nextpc','jumpmux'],calc:branch?`PC ← ${hex(e.nextPC)} · RegWrite = 0 · Jump = 0`:`$t0 ← ${e.value} · PC ← ${hex(e.nextPC)}`}
 ];return common[step];
}
