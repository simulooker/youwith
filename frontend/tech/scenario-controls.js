export function scenarioControls(cases,onChange){
  let caseIndex=0,step=0;
  const $=id=>document.getElementById(id);
  function update(){
    const current=cases[caseIndex],stages=current.stages;
    const focus=document.activeElement,focusedCase=focus?.dataset.case,focusedStep=focus?.dataset.step;
    $('case-options').innerHTML=cases.map((item,i)=>`<button type="button" data-case="${i}" aria-pressed="${caseIndex===i}">${item.title}<small>${item.subtitle}</small></button>`).join('');
    $('case-options').querySelectorAll('button').forEach(b=>b.onclick=()=>{caseIndex=Number(b.dataset.case);step=0;update();});
    $('step-count').textContent=`${step+1} / ${stages.length} 단계`;
    $('step-track').innerHTML=stages.map((s,i)=>`<li><button type="button" data-step="${i}" aria-label="${i+1}단계: ${s.title}" ${i===step?'aria-current="step"':''}>${i+1}</button></li>`).join('');
    $('step-track').querySelectorAll('button').forEach(b=>b.onclick=()=>{step=Number(b.dataset.step);update();});
    $('previous-step').disabled=step===0;$('next-step').disabled=step===stages.length-1;
    $('next-step').textContent=step===stages.length-1?'마지막 단계':'다음 단계';
    $('stage-name').textContent=stages[step].title;$('stage-description').textContent=stages[step].description;
    for(const [id,key] of [['lesson-why','why'],['lesson-watch','watch'],['lesson-math','calculation']]){const field=$(id);if(field)field.textContent=stages[step][key]||'';}
    document.body.dataset.case=String(caseIndex);document.body.dataset.step=String(step);
    onChange(current,stages[step],caseIndex,step);
    if(focusedCase!==undefined)$('case-options').querySelector(`[data-case="${focusedCase}"]`)?.focus({preventScroll:true});
    if(focusedStep!==undefined)$('step-track').querySelector(`[data-step="${focusedStep}"]`)?.focus({preventScroll:true});
  }
  $('previous-step').onclick=()=>{if(step>0){step--;update();}};
  $('next-step').onclick=()=>{if(step<cases[caseIndex].stages.length-1){step++;update();}};
  $('show-result').onclick=()=>{step=cases[caseIndex].stages.length-1;update();};
  $('restart-case').onclick=()=>{step=0;update();};
  update();
}
