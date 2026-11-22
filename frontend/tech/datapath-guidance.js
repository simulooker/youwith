import {hex,binary,REGISTER_NAMES} from './datapath-state.js?v=3';
export const CONTROL_ROWS=[
 ['RegDst',1,'Register Destination','쓰기 대상 선택','0: rt · 1: rd'],
 ['ALUSrc',1,'ALU Source','ALU 두 번째 입력','0: Read data 2 · 1: 부호 확장값'],
 ['MemtoReg',1,'Memory to Register','기록할 값의 출처','0: ALU 결과 · 1: 메모리 읽기값'],
 ['RegWrite',1,'Register Write','레지스터 쓰기 허용','1: 클록 경계에서 기록'],
 ['MemRead',1,'Memory Read','데이터 메모리 읽기','1: Address에서 32비트 읽기'],
 ['MemWrite',1,'Memory Write','데이터 메모리 쓰기','1: Address에 Write data 기록'],
 ['Branch',1,'Branch','조건 분기 사용','PCSrc = Branch AND Zero'],
 ['ALUOp',2,'ALU Operation','ALU 연산 종류 지시','00: ADD · 01: SUB · 10: funct 해독']
];
const phase=(routes,start,end,color)=>routes.map((id,i)=>({id,start:start+(end-start)*i/routes.length,end:start+(end-start)*(i+1)/routes.length,color}));
export function pathGroups(e){
 const r=e.kind==='r',lw=e.kind==='lw',beq=e.kind==='beq';
 const controls=['opcode','ctrlRegDst','ctrlJump','ctrlBranch','ctrlMemRead','ctrlMemtoReg','ctrlALUOp','ctrlMemWrite','ctrlALUSrc','ctrlRegWrite','aluDecode',...(r?['funct']:[])];
 const pc=[...phase(['pc4','constant4'],0,.35,'pc'),...phase(['sequential'],.35,.65,'pc'),...phase(['jumpPass'],.65,.8,'pc'),...phase(['pcReturn'],.8,1,'pc')];
 const data=r?[
  ...phase(['fetch'],0,.08,'instruction'),...phase(['rs'],.08,.25,'rs'),...phase(['rt'],.08,.25,'rt'),...phase(['rd','destWrite'],.08,.25,'destination'),
  ...phase(['readA'],.25,.48,'rs'),...phase(['readB','muxB'],.25,.48,'rt'),
  ...phase(['aluBypass','aluWB'],.48,.72,'result'),...phase(['writeback'],.72,1,'result')
 ]:lw?[
  ...phase(['fetch'],0,.08,'instruction'),...phase(['rs'],.08,.25,'rs'),...phase(['rtDest','destWrite'],.08,.25,'destination'),...phase(['imm','extB'],.08,.4,'immediate'),
  ...phase(['readA'],.25,.45,'rs'),...phase(['muxB'],.4,.45,'immediate'),...phase(['address'],.45,.6,'result'),...phase(['memoryOut','loadWB'],.6,.75,'result'),...phase(['writeback'],.75,1,'result')
 ]:[
  ...phase(['fetch'],0,.08,'instruction'),...phase(['rs'],.08,.25,'rs'),...phase(['rt'],.08,.25,'rt'),
  ...phase(['readA'],.25,.45,'rs'),...phase(['readB','muxB'],.25,.45,'rt'),
  ...phase(['pc4'],0,.2,'pc'),...phase(['constant4'],0,.2,'pc'),...phase(['branchBase'],.2,.45,'pc'),...phase(['imm','shift','branchOffset'],.08,.45,'immediate'),
  ...phase(['zero','ctrlBranch'],.45,.65,'control'),...phase(['branchSelect'],.65,.75,'control'),
  ...phase([e.branch?'takeBranch':'sequential'],.75,.85,'pc'),...phase(['jumpPass','pcReturn'],.85,1,'pc')
 ];
 const group={id:'data',title:r?'두 피연산자 → 덧셈 → rd 기록':lw?'base·offset → 주소 → 메모리 → rt 기록':'두 피연산자 비교 + 분기 주소 → 다음 PC',
  summary:r?`rs($t1=5)와 rt($t2=7)를 함께 읽고, 합 12를 rd($t0)에 기록합니다.`:lw?'rs($s0)의 주소와 offset 12를 더해 메모리를 읽고, 42를 rt($t0)에 기록합니다.':`rs($t0=12)와 rt($t1=${e.b})를 함께 비교하고, 분기 주소 계산과 합쳐 다음 PC를 고릅니다.`,
  streams:data,rows:r?[['레지스터 번호','rs=9 · rt=10 · rd=8 (각 5비트)'],['읽기 값','Read data 1=5 · Read data 2=7 (각 32비트)'],['계산','ALU: 5 + 7 = 12'],['기록값 경로','ALU result → MemtoReg=0 → Write data'],['기록 대상 경로','rd=8 → RegDst=1 → Write register'],['최종 기록','$t0 ← 12']]:lw?[['base 주소',hex(e.a)],['offset','SignExt(12) = 12바이트 · <<2 없음'],['유효 주소',hex(e.alu)],['메모리 읽기',`Memory[${hex(e.alu)}] = 42`],['기록값 경로','Read data → MemtoReg=1 → Write data'],['기록 대상 경로','rt=8 → RegDst=0 → Write register'],['최종 기록','$t0 ← 42']]:[['두 읽기 값',`12 · ${e.b}`],['비교',`12 − ${e.b} = ${e.alu} → Zero=${e.zero}`],['분기 주소',`${hex(e.pc4)} + (−3 << 2) = ${hex(e.target)}`],['주소 선택',`Branch(1) AND Zero(${e.zero}) = ${Number(e.branch)}`],['다음 PC',hex(e.nextPC)],['레지스터 기록','RegWrite=0 · 없음']]};
 const list=[group];if(!beq)list.push({id:'pc',title:'PC → PC+4 → 다음 PC',summary:'4바이트 뒤의 명령어 주소를 골라 PC로 되돌립니다.',streams:pc,rows:[['현재 PC',hex(e.pc)],['가산기',`PC + 4 = ${hex(e.pc4)}`],['Branch Mux','PCSrc=0 → 입력 0'],['Jump Mux','Jump=0 → 입력 0'],['최종 PC',hex(e.pc4)]]});
 list.push({id:'control',title:'opcode·funct → 제어 신호 → 유닛',summary:'명령어를 해독해 MUX 선택과 읽기·쓰기 허용을 설정합니다.',streams:controls.map(id=>({id,start:id==='opcode'?0:id==='aluDecode'?.65:.2,end:id==='opcode'?.2:id==='aluDecode'?.9:.65,color:'control'})),rows:[['opcode',binary(e.fields.opcode,6)],['Main Control','8개 제어 신호 + 별도 Jump=0'],['ALUOp',e.control.ALUOp],['ALU control',`${e.aluControl} (${beq?'SUB':'ADD'})`],['역할','데이터 값이 아닌 선택·동작 지시']]});
 return list;
}
export function stepRows(e,step){
 const r=e.kind==='r',lw=e.kind==='lw',b=e.kind==='beq',f=e.fields;
 return [
  [['목적','명령어와 순차 주소 준비'],['입력',`PC=${hex(e.pc)}`],['동작','Instruction memory의 Read address에 PC 전달'],['명령어',`${hex(e.word)} · 32비트`],['병렬 계산',`PC+4=${hex(e.pc4)}`]],
  [['형식',r?'R-format · opcode/rs/rt/rd/shamt/funct':'I-format · opcode/rs/rt/immediate'],['opcode',`${binary(f.opcode,6)} → Control`],['rs',`${binary(f.rs,5)} → Read register 1 (${REGISTER_NAMES[f.rs]})`],['rt',`${binary(f.rt,5)} → ${lw?'쓰기 대상':'Read register 2'}`],[r?'rd':'immediate',r?`${binary(f.rd,5)} → 쓰기 대상 후보`:`${f.immediate} → Sign-extend`],['ALU 지시',r?'ALUOp=10 + funct=100000 → ADD':b?'ALUOp=01 → SUB':'ALUOp=00 → ADD']],
  [['입력 1',`${REGISTER_NAMES[f.rs]} → Read data 1=${lw?hex(e.a):e.a}`],['입력 2',lw?'SignExt(12) → ALU B':`${REGISTER_NAMES[f.rt]} → Read data 2=${e.b}`],['선택 신호',`ALUSrc=${e.control.ALUSrc}`],['비트 구분','5비트 번호로 고른 레지스터에서 32비트 데이터를 읽음']],
  [['연산',b?'SUB · 뺄셈':'ADD · 덧셈'],['입력',`${lw?hex(e.a):e.a} ${b?'−':'+'} ${e.b}`],['ALU 결과',lw?hex(e.alu):String(e.alu)],['결과 의미',lw?'메모리 주소':b?'0이면 두 값이 같음':'기록할 덧셈 결과'],['Zero',String(e.zero)]],
  lw?[['읽기 주소',hex(e.alu)],['메모리 값','42'],['제어','MemRead=1 · MemWrite=0'],['기록값 선택','MemtoReg=1 → Read data']]:b?[['분기 offset','−3 명령어 = −12바이트'],['목적지',`${hex(e.pc4)} − 12 = ${hex(e.target)}`],['분기 조건',`Branch(1) AND Zero(${e.zero})=${Number(e.branch)}`],['선택된 주소',hex(e.nextPC)],['메모리·기록','MemRead=0 · MemWrite=0 · RegWrite=0']]:[['데이터 메모리','사용하지 않음'],['기록값 선택','MemtoReg=0 → ALU result'],['기록할 값','12'],['주의','ALU 결과는 메모리를 거치지 않고 되돌아감']],
  [['기록 시점','클록 경계'],['RegWrite',String(e.control.RegWrite)],['기록 대상',b?'없음':r?'rd=8 ($t0) · RegDst=1':'rt=8 ($t0) · RegDst=0'],['기록 값',b?'범용 레지스터는 그대로':String(e.value)],['다음 PC',`${hex(e.pc)} → ${hex(e.nextPC)}`],['Jump','0 · Branch Mux 출력을 통과']]
 ][step];
}
export function fieldRows(e,name){
 const f=e.fields;
 const details={opcode:['[31:26]',binary(f.opcode,6),'명령 종류','Control'],rs:['[25:21]',binary(f.rs,5),`번호 ${f.rs} (${REGISTER_NAMES[f.rs]})`,'Read register 1'],rt:['[20:16]',binary(f.rt,5),`번호 ${f.rt} (${REGISTER_NAMES[f.rt]})`,e.kind==='lw'?'RegDst Mux 입력 0 → Write register':'Read register 2'],rd:['[15:11]',binary(f.rd,5),`번호 ${f.rd} (${REGISTER_NAMES[f.rd]})`,'RegDst Mux 입력 1 → Write register'],shamt:['[10:6]',binary(f.shamt,5),'시프트 양 · add에서는 사용하지 않음','미사용'],funct:['[5:0]',binary(f.funct,6),'add 연산 코드','ALU control (ALUOp=10일 때)'],immediate:['[15:0]',binary(f.immediate,16),`signed 값 ${f.immediate}`,'Sign-extend → ALUSrc 또는 Branch Shift']};
 const a=details[name];return [['필드',name],['범위',a[0]],['비트',a[1]],['의미',a[2]],['도착지',a[3]]];
}
export const PORT_MEANINGS={
 pc:[['PC','Program Counter · 다음에 읽을 명령어의 바이트 주소']],
 imem:[['Read address','읽을 명령어의 주소 · PC에서 받음'],['Instruction [31–0]','읽어낸 32비트 명령어']],
 regs:[['Read register 1','rs의 5비트 번호'],['Read register 2','rt의 5비트 번호'],['Write register','RegDst Mux가 고른 5비트 목적지 번호'],['Write data','MemtoReg Mux에서 온 32비트 기록값'],['Read data 1','rs로 선택한 레지스터의 32비트 값'],['Read data 2','rt로 선택한 레지스터의 32비트 값']],
 alu:[['ALU','Arithmetic Logic Unit · 산술논리장치'],['입력 A','Read data 1'],['입력 B','ALUSrc Mux 출력'],['Zero','ALU 결과가 0이면 1'],['ALU result','덧셈 결과 · 주소 또는 비교 결과']],
 mem:[['Address','ALU가 계산한 바이트 주소'],['Write data','Read data 2 · MemWrite=1일 때만 기록'],['Read data','MemRead=1일 때 읽은 32비트 값']],
 control:[['Control','opcode를 해독해 선택·허용 신호를 생성'],['입력','Instruction[31:26]'],['출력','8개 주 제어 신호 + Jump']],
 aluctrl:[['ALU control','ALUOp와 funct로 실제 연산 선택'],['입력','ALUOp(2비트) · funct(6비트)'],['출력','0010: ADD · 0110: SUB (교재 인코딩)']],
 extend:[['Sign-extend','16비트 부호 비트를 복제해 32비트로 확장'],['입력','Instruction[15:0]'],['출력','부호가 보존된 signed 32비트 값']],
 plus4:[['Add','PC + 4'],['4','32비트 명령어 한 개의 바이트 수']],
 target:[['Add','PC+4 + (SignExt(immediate) << 2)'],['ALU result','분기 목적지 · 비교용 ALU 결과와 별개']],
 shift:[['Shift left 2','분기용 · signed 32비트 값을 2비트 이동'],['의미','명령어 개수 offset → 바이트 offset']],
 jumpShift:[['Shift left 2','Jump용 · 하위 26비트 → 28비트'],['주소 결합','PC+4 상위 4비트 + 결과 28비트']],
 regdst:[['Mux','Multiplexer · 두 입력 중 하나 선택'],['0','rt = Instruction[20:16]'],['1','rd = Instruction[15:11]'],['선택 신호','RegDst']],
 alusrc:[['Mux','Multiplexer · 두 입력 중 하나 선택'],['0','Read data 2'],['1','Sign-extend 출력'],['선택 신호','ALUSrc']],
 wb:[['Mux','Multiplexer · 두 입력 중 하나 선택'],['0','ALU result'],['1','Data memory의 Read data'],['선택 신호','MemtoReg']],
 nextpc:[['Mux','분기 주소 선택'],['0','PC+4'],['1','분기 가산기의 결과'],['선택 신호','Branch AND Zero']],
 jumpmux:[['Mux','최종 다음 PC 선택'],['0','Branch Mux 출력'],['1','Jump 주소'],['선택 신호','Jump · 현재 세 예제는 0']],
 branch:[['AND','두 입력이 모두 1일 때만 출력 1'],['입력','Branch · Zero'],['출력','PCSrc = Branch AND Zero']]
};
