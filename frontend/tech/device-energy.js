// Saved normalized teaching profiles, not computed band energies or eV values.
const settings=[{barrier:1.08,drain:0},{barrier:.64,drain:0},{barrier:.18,drain:0},{barrier:.18,drain:-.36},{barrier:1.08,drain:-.36}];
const profiles=settings.map(({barrier,drain})=>Object.freeze(Array.from({length:65},(_,i)=>{const x=i/64;return barrier*Math.sin(Math.PI*x)**2+drain*x;})));

export function energyProfile(stage,polarity='n'){
  const values=profiles[stage],p=polarity==='p',carrier=p?'정공':'전자',peak=Math.max(...values),peakIndex=values.indexOf(peak);
  const explanations=[
    `Gate OFF · ${carrier}가 넘기 어려운 높은 장벽 때문에 소스에서의 유입이 적어요.`,
    `Gate가 ${carrier}의 에너지 장벽을 낮추기 시작해요. 다른 전하가 물러나는 것만으로 충분한 전도 경로가 생기지는 않아요.`,
    `낮아진 장벽 덕분에 더 많은 ${carrier}가 채널을 채워요. 아직 Source=Drain이므로 한 방향 순전류는 없어요.`,
    `장벽은 낮고 Drain 쪽 운반자 에너지는 더 낮아요. 전압 차이에 따라 ${carrier}가 Source → Drain으로 순이동해요.`,
    `Drain 전압 차이는 남아 있어도 Gate가 만든 높은 장벽이 다시 유입을 억제해요. 실제 OFF 누설이 완전히 0인 것은 아니에요.`
  ];
  return {stage,polarity,values,peak,peakIndex,kind:p?'정공 장벽 · (−E_v)의 Source 기준 상대값':'전자 장벽 · E_c의 Source 기준 상대값',explanation:explanations[stage],reference:0};
}

export function createEnergy(v){
  const root=document.getElementById('energy-profile'),chapter=document.getElementById('operation-chapter');
  root.innerHTML=`<p id="energy-kind" class="control-note"></p>
<svg id="energy-plot" viewBox="0 0 300 180" role="img" aria-labelledby="energy-svg-title energy-svg-description" style="display:block;width:100%;height:auto;stroke:none;fill:#d6e7f2" font-family="inherit" font-size="14" fill="#d6e7f2">
<title id="energy-svg-title">Source에서 Drain까지의 운반자 에너지 장벽</title><desc id="energy-svg-description"></desc>
<text x="7" y="18">운반자 에너지 ↑</text><path d="M151 13h22" fill="none" stroke="#b7cedd" stroke-width="1.5" stroke-dasharray="4 4"></path><text x="179" y="18">Source 기준 0</text>
<path d="M22 143V30m0 0-4 7m4-7 4 7M22 143h263m0 0-7-4m7 4-7 4" fill="none" stroke="#829fb3" stroke-width="1.3"></path>
<path d="M34 115H274" fill="none" stroke="#b7cedd" stroke-width="1.4" stroke-dasharray="4 4"></path>
<path id="energy-barrier" fill="none" stroke="#a6dec4" stroke-width="1.4" stroke-dasharray="3 3"></path>
<path id="energy-curve" fill="none" stroke="#77e5ff" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"></path>
<circle id="energy-peak" r="3.8" fill="#77e5ff"></circle><circle cx="34" cy="115" r="3" fill="#d6e7f2"></circle>
<text x="34" y="165">Source</text><text x="154" y="165" text-anchor="middle">Channel</text><text x="274" y="165" text-anchor="end">Drain</text>
</svg><p id="energy-state" aria-live="polite"></p><p class="control-note">가로는 Source→Drain 위치, 세로는 운반자 에너지예요. 소자가 실제로 솟거나 벽이 생기는 모습이 아닙니다. 상대값을 그린 개념도이며 실제 eV·열적 에너지 분포·터널링을 계산하지 않습니다.</p>`;
  const $=id=>document.getElementById(id),curve=$('energy-curve'),barrier=$('energy-barrier'),peak=$('energy-peak'),kind=$('energy-kind'),state=$('energy-state'),description=$('energy-svg-description');
  let stage=0,polarity='n',current=Float64Array.from(profiles[0]),from=current.slice(),target=profiles[0],started=0,animation=false,dirty=true,wasHidden=false;
  function set(index,nextPolarity,replay=false){
    from=replay?Float64Array.from(profiles[Math.max(0,index-1)]):current.slice();stage=index;polarity=nextPolarity;target=profiles[index];started=performance.now();animation=from.some((x,i)=>Math.abs(x-target[i])>1e-9);dirty=true;
    const data=energyProfile(stage,polarity),color=polarity==='p'?'#ffd077':'#77e5ff';
    kind.textContent=data.kind;state.textContent=data.explanation;description.textContent=data.kind+'. '+data.explanation+' 점선은 Source의 상대 기준 에너지이며 곡선은 물체의 높이가 아닙니다.';
    curve.setAttribute('stroke',color);peak.setAttribute('fill',color);
    Object.assign(root.dataset,{energyStage:String(stage),energyPolarity:polarity,energyDefinition:polarity==='p'?'minus-Ev':'Ec',energyAnimating:String(animation)});v.render();
  }
  function draw(time,hidden=false){
    if(wasHidden!==hidden){root.hidden=hidden;wasHidden=hidden;}
    if(hidden||!chapter.open){current.set(target);animation=false;dirty=true;if(root.dataset.energyAnimating!=='false')root.dataset.energyAnimating='false';return false;}
    if(!animation&&!dirty)return false;
    const t=v.reduced()?1:Math.min(1,Math.max(0,(time-started)/1000)),e=1-Math.pow(1-t,3);let d='',maximum=-Infinity,maximumIndex=0;
    for(let i=0;i<current.length;i++){
      current[i]=animation?from[i]+(target[i]-from[i])*e:target[i];if(current[i]>maximum){maximum=current[i];maximumIndex=i;}
      d+=(i?'L':'M')+(34+i/64*240).toFixed(2)+','+(115-current[i]*68).toFixed(2);
    }
    curve.setAttribute('d',d);const x=34+maximumIndex/64*240,y=115-maximum*68;barrier.setAttribute('d',`M${x.toFixed(2)},115V${y.toFixed(2)}`);peak.setAttribute('cx',x.toFixed(2));peak.setAttribute('cy',y.toFixed(2));
    if(t===1)animation=false;dirty=false;root.dataset.energyAnimating=String(animation);return animation;
  }
  chapter.addEventListener('toggle',()=>v.render());set(0,'n');return {set,draw};
}
