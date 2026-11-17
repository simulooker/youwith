const panel=document.getElementById('explanation-panel');
const toggle=document.getElementById('toggle-explanation');
const close=document.getElementById('close-explanation');
const mobile=matchMedia('(max-width:800px)');

function setPanel(open,returnFocus=false){
  const visible=!mobile.matches||open;
  document.body.dataset.panelOpen=String(visible);
  panel.inert=!visible;
  panel.setAttribute('aria-hidden',String(!visible));
  toggle.setAttribute('aria-expanded',String(visible));
  if(returnFocus&&mobile.matches)toggle.focus({preventScroll:true});
  window.dispatchEvent(new Event('lab-panel-change'));
}
toggle.addEventListener('click',()=>setPanel(document.body.dataset.panelOpen!=='true'));
close.addEventListener('click',()=>setPanel(false,true));
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&mobile.matches&&document.body.dataset.panelOpen==='true')setPanel(false,true);
});
mobile.addEventListener('change',()=>setPanel(!mobile.matches));
setPanel(!mobile.matches);

export function revealExplanation(chapterId,targetId){
  setPanel(true);
  const chapter=document.getElementById(chapterId);
  if(chapter)chapter.open=true;
  requestAnimationFrame(()=>document.getElementById(targetId||chapterId)?.scrollIntoView({block:'nearest',behavior:'instant'}));
}
