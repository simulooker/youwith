export function deviceLesson(polarity='n',device='mosfet'){
  const p=polarity==='p',mobile=p?'정공':'전자',majority=p?'전자':'정공',gate=p?'낮은':'높은',bias=p?'VSG':'VGS';
  const steps=[
    {title:`가운데에도 소수의 ${mobile}가 있어요`,description:`${p?'P+–N–P+':'N+–P–N+'} 단면에서 양끝에는 ${mobile}가 많고, 가운데에는 ${majority}와 소수의 ${mobile}가 함께 있습니다. 아직 표면을 잇는 반전 채널은 없습니다.`,why:'P형에도 소수 전자, N형에도 소수 정공이 존재합니다. 표시한 입자 개수는 이 차이를 설명하는 기호이며 실제 농도 비율은 아닙니다. 줄맞춤은 이동 경로를 보기 위한 배치이며 고정된 원자·도핑 격자가 아닙니다. 평형에서는 순전류가 없습니다.',watch:`가운데 내부의 ${p?'금색 ＋ 고리':'하늘색 작은 점'}도 찾아보세요. ${p?'전자':'정공'}보다 적게 표시했습니다.`,gate:p?1:0,drain:p?1:0,source:p?1:0,bias:0,inversion:0},
    {title:`${majority}는 멀어지고 ${mobile}는 표면으로 끌려요`,description:`Gate를 ${gate} 전위로 옮기면 표면의 ${majority}가 내부로 물러나고, 소수 ${mobile}는 절연막 바로 아래로 끌립니다.`,why:'정공처럼 다수 운반자가 줄어든 상태를 공핍이라고 합니다. 공핍 영역 자체가 전도 채널은 아닙니다. 이후 표면에 반대 종류 운반자가 충분히 많아져야 반전 채널이 됩니다.',watch:`${majority}는 표면에서 멀어지고 ${mobile}는 절연막 가까이 이동합니다. 초록 화살표는 전기장입니다.`,gate:p?.65:.35,drain:p?1:0,source:p?1:0,bias:.35,inversion:0},
    {title:`표면에 ${mobile}가 모여 반전 채널이 돼요`,description:`${bias}가 문턱 전압보다 충분히 커지면 표면의 ${mobile} 농도가 높아집니다. ${p?'P+':'N+'} 소스·드레인에서도 ${mobile}가 공급되어 얇은 전도 경로를 이룹니다.`,why:'MOSFET의 반전층 운반자는 소스·드레인에서 빠르게 공급될 수 있습니다. 몸체에 원래 있던 소수 운반자만으로 채널 전체가 만들어진다는 뜻은 아닙니다. 지금은 Source=Drain이라 채널이 있어도 순전류는 없습니다.',watch:`소수 ${mobile}가 표면 쪽으로 옮겨지고, 양끝의 ${mobile}도 가운데로 들어와 이어지는 모습을 보세요.`,gate:p?0:1,drain:p?1:0,source:p?1:0,bias:1,inversion:1},
    {title:`전압 차이를 주면 ${mobile}가 내부를 따라 이동해요`,description:`소스와 드레인의 전위 차이가 생겨 ${mobile}가 반도체 내부의 채널을 따라 Source → Drain으로 순이동합니다. Gate나 절연막을 통과하지 않습니다.`,why:p?'정공은 높은 전위의 Source에서 낮은 전위의 Drain으로 움직입니다. 관습적 전류 방향과 같습니다.':'전자는 낮은 전위의 Source에서 높은 전위의 Drain으로 움직입니다. 관습적 전류 방향은 반대입니다.',watch:`${p?'금색 ＋ 고리':'하늘색 점'}이 투명한 관찰창 안쪽을 따라 이동합니다. 바깥쪽의 금속과 기판은 불투명하게 유지됩니다.`,gate:p?0:1,drain:.5,source:p?1:0,bias:1,inversion:1},
    {title:'Gate를 되돌리면 입자 분포도 돌아와요',description:`Gate를 처음 전위로 되돌리면 표면의 ${mobile}가 소스·드레인이나 몸체 쪽으로 물러나고, ${majority}가 표면 가까이 돌아옵니다.`,why:'바뀌는 것은 이동 전하의 위치와 농도입니다. P/N 도핑 원자 수는 바뀌지 않습니다. 실제 약반전 전류와 누설은 0이 아니지만 이 개념 모형에서는 순이동을 멈춰 표시합니다.',watch:'표면에 모였던 입자가 흩어지고 원래의 분포로 돌아옵니다.',gate:p?1:0,drain:.5,source:p?1:0,bias:0,inversion:0}
  ];
  if(device!=='mosfet'){
    const shape=device==='finfet'?'핀':'나노시트';
    Object.assign(steps[0],{title:'Gate OFF: 이동 전하가 적어요',description:`이 ${shape} 채널은 낮은 도핑/거의 무도핑을 가정합니다. ${p?'P+':'N+'} 소스·드레인의 ${mobile}와 채널의 소량 전자·정공을 구분해 보세요.`,why:'저도핑 채널 전체가 다수 정공 또는 다수 전자로 가득한 벌크라는 뜻은 아닙니다. 줄맞춤은 이동 경로를 보기 위한 배치이며 원자·도핑 격자가 아닙니다. 기호 개수는 실제 농도 비율이 아니며 Gate OFF에서 순전류를 생략한 개념 모형입니다.',watch:`채널 안에도 ${mobile}가 처음부터 있습니다. 네 입자씩 같은 이동을 공유하며 표시합니다.`});
    Object.assign(steps[1],{title:`Gate가 ${mobile} 유입을 쉽게 해요`,description:`Gate 전기장이 ${shape} 안의 전위를 바꿔 ${mobile}가 더 모이기 좋은 상태가 됩니다. 반대 종류 운반자의 밀도는 줄어듭니다.`,why:`n형 소자의 전도 운반자는 전자입니다. 정공이 줄어도 전자가 만드는 경로는 유지될 수 있습니다. p형 소자에서는 역할이 반대입니다. Gate·절연막을 관통하는 전류가 아니라 전기장 제어입니다.`,watch:`이 그림에서 물러나는 ${majority}도 ${shape}의 실리콘 안에 있습니다. 공기 중으로 빠져나가는 표현이 아닙니다.`});
    Object.assign(steps[2],{title:`소스·드레인의 ${mobile}가 ${shape}를 채워요`,description:`Gate가 충분히 ${p?'낮아지면':'높아지면'} ${p?'P+':'N+'} 소스·드레인에서 공급된 ${mobile}의 채널 농도가 높아집니다. 몸체의 소수 운반자만으로 채우는 것이 아닙니다.`,why:'채널 형성과 한 방향의 전류는 별개입니다. 지금은 Source=Drain이므로 전하가 모여도 순전류는 없습니다. 저도핑 나노 구조에는 벌크 P형 몸체의 공핍 설명을 그대로 적용하지 않습니다.',watch:`${p?'금색 ＋ 고리':'하늘색 점'}이 연결된 ${shape} 내부의 경로를 만드는 모습을 보세요.`});
    Object.assign(steps[4],{title:`Gate OFF: ${mobile} 밀도가 줄어요`,description:`Gate를 처음 전위로 되돌리면 ${shape}에 모인 ${mobile}가 소스·드레인 쪽으로 물러납니다. 실리콘 구조 자체가 사라지는 것은 아닙니다.`,why:'낮아지는 것은 이동 전하의 밀도이며 고정 도핑이나 시트 형상이 아닙니다. 실제 문턱 이하 전류와 누설은 이 개념 모형에서 생략합니다.',watch:'전하 분포가 처음 상태로 돌아갑니다. 입자는 반도체 안에서만 이동합니다.'});
  }
  return steps.map((s,index)=>({...s,index,watch:device==='mosfet'&&index===3?s.watch+' 보라색 선은 별도의 PN 접합 공핍 경계입니다.':device==='mosfet'&&index===4?s.watch+' Drain 역바이어스는 남아 있으므로 오른쪽 접합 공핍 폭은 유지됩니다.':s.watch}));
}

// Gate redistribution and junction reverse bias are independent normalized states.
export function chargeState(stage){return {fill:stage===2||stage===3?1:0,depletion:stage>0&&stage<4?1:0,junction:stage>=3?1:0};}

// Ordered display lanes represent mobile carriers, not a fixed atomic/dopant lattice.
export function writeCarrierPosition(out,offset,r,kind,i,state){
  const {fill,depletion,drift}=state,flat=r.style==='flat',fin=r.style==='fin';let x,y,z;
  if(kind==='mobile'){
    const column=i%12,lane=Math.floor(i/12),unit=(column+.5)/12,halfSpan=fin?2.7:2.8;
    const reservoir=column<6?-2.8+column*.16:2+(column-6)*.16;
    const phase=drift===null?unit:(unit+drift)%1,targetX=-halfSpan+phase*2*halfSpan;
    x=drift===null?reservoir+(targetX-reservoir)*fill:targetX;
    if(flat){y=(-.09+lane*.055)*(1-fill)+.12*fill;z=.805+lane*.23;}
    else if(fin){y=.25+lane*.4;z=(lane%2?1:-1)*(.035+.105*fill);}
    else{y=r.y+(lane<2?1:-1)*.05*fill;z=.20+lane*.20;}
  }else if(kind==='majority'){
    const columns=flat?8:4,column=i%columns,row=Math.floor(i/columns);
    x=flat?-1.12+column*.32:-1.05+column*.7;
    if(flat){const initial=-.10-row*.20,target=-.45-row*.14;y=initial+(target-initial)*depletion;z=1.15;}
    else if(fin){const initial=.55+row*.60,target=.04+row*.28;y=initial+(target-initial)*depletion;z=.11;}
    else{const reservoir=[-2.70,-2.10,2.10,2.70][column];x+=(reservoir-x)*depletion;y=r.y;z=.32+row*.36;}
  }else if(kind==='minority'){
    const column=i%3,row=Math.floor(i/3),attraction=Math.min(1,depletion*.25+fill*.75);x=-.9+column*.9;
    if(flat){const initial=-.26-row*.29,target=.115-row*.015;y=initial+(target-initial)*attraction;z=.96+row*.30;}
    else if(fin){y=.60+(1.60-.60)*attraction;z=.015;}
    else{y=r.y+.06*attraction;z=.46;}
  }else{
    const side=i<12?-1:1,local=i%12,column=local%4,row=Math.floor(local/4);
    x=side*(2+column*.25);
    if(flat){y=-.105+row*.10;z=1.10;}
    else if(fin){y=.20+row*.50;z=.12;}
    else{y=r.y;z=.25+row*.25;}
  }
  out[offset]=x;out[offset+1]=y;out[offset+2]=z;
}

// Four symbols form a regular rectangle while sharing one uploaded trajectory.
export function carrierGroupOffsets(style){
  const x=.10,y=style==='fin'?.075:0,z=style==='fin'?0:style==='sheet'?.05:.0575;
  return new Float32Array([-x,-y,-z,x,-y,-z,-x,y,z,x,y,z]);
}
