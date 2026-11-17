// Relative carrier density is illustrative; it is not a TCAD solution or dopant concentration.
export function gateState(device,high){
  const n={on:high,carrier:'전자',density:high?1:.04,direction:'Source → Drain',current:'Drain → Source'};
  const p={on:!high,carrier:'정공',density:high?.04:1,direction:'Source → Drain',current:'Source → Drain'};
  return {n,p:device==='cfet'?p:null};
}
export function partInfo(device,role,polarity='n'){
  const planar=device==='mosfet',p=polarity==='p',prefix=device==='cfet'&&!['body','isolation','middle'].includes(role)?(p?'아래쪽 pFET · ':'위쪽 nFET · '):'';
  const carrier=p?'정공':'전자',doping=p?'P+ · 억셉터 고농도':'N+ · 도너 고농도';
  const entries={
    body:['기판 / Body','소자의 바탕이 되는 실리콘입니다.','채널 아래의 전위와 접합을 형성합니다.',planar?'P형 · 예시 Nₐ = 10¹⁶ cm⁻³':'실리콘 기판 · 구조 설명용, 공정별 도핑은 다릅니다.'],
    source:['Source · 소스',`${carrier}를 채널에 공급하는 반도체 영역입니다.`,p?'pFET에서는 높은 전위 쪽에서 정공을 공급합니다.':'nFET에서는 낮은 전위 쪽에서 전자를 공급합니다.',planar?'N+ · 예시 Nᴅ = 10²⁰ cm⁻³':doping+' · 수치는 공정에 따라 달라집니다.'],
    drain:['Drain · 드레인','채널을 지난 전하 운반자를 받아들이는 영역입니다.','Source와의 전압 차이가 전하의 순이동을 만듭니다.',planar?'N+ · 예시 Nᴅ = 10²⁰ cm⁻³':doping+' · 수치는 공정에 따라 달라집니다.'],
    channel:['Channel · 채널',device==='finfet'?'위로 솟은 실리콘 Fin입니다.':planar?'게이트 바로 아래의 실리콘 표면입니다.':'얇게 쌓은 실리콘 나노시트입니다.',`Gate 전기장이 ${carrier}의 이동 농도를 바꿔 통로를 열거나 닫습니다.`,planar?'P형 몸체 표면 → ON일 때 전자 반전층':'낮은 도핑 / 거의 무도핑 채널을 가정한 학습 모델'],
    oxide:['Gate dielectric · 절연막','게이트와 반도체 사이의 얇은 절연층입니다.','전기장을 전달하면서 게이트에서 채널로 전하가 직접 흐르는 것을 막습니다.','절연체 · P/N 도핑 영역이 아닙니다.'],
    gate:['Gate · 게이트',device==='finfet'?'Fin의 위와 양옆 세 면을 감쌉니다.':planar?'채널 위에 놓인 제어 전극입니다.':'나노시트의 위·아래·양옆을 감싸는 제어 전극입니다.',p?'낮은 입력에서 정공 채널이 켜지고, 높은 입력에서는 꺼집니다.':'높은 입력에서 전자 채널이 켜지고, 낮은 입력에서는 꺼집니다.','금속 전극 · P/N 농도와 구분합니다.'],
    isolation:['Isolation · 절연층','서로 분리해야 하는 실리콘 영역 사이의 절연체입니다.','원치 않는 전류 경로를 억제합니다.','절연체 · P/N 도핑 영역이 아닙니다.'],
    middle:['층간 절연막','CFET 위·아래 소자를 분리하는 절연층입니다.','nFET과 pFET 사이의 직접 전도를 막습니다.','절연체 · P/N 도핑 영역이 아닙니다.'],
    contact:['Metal contacts · 금속 접점','Source와 Drain 위의 금속 연결부입니다.','소자를 외부 회로에 연결합니다.','금속 · 반도체의 N+/P+ 도핑과 다릅니다.']
  };
  const [name,description,job,density]=entries[role];
  const short=role==='source'?'Source · '+(p?'P+':'N+'):role==='drain'?'Drain · '+(p?'P+':'N+'):role==='body'&&planar?'기판 / P형':name;
  return {name:prefix+short,description,job,density};
}
