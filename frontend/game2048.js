// 2048 rules and UI. A turn merges each tile once and spawns only after a valid move.
function game2048Slide(board,direction){
 const next=Array(16).fill(0),movements=[],merged=[];let score=0;
 for(let line=0;line<4;line++){
  const indices=Array.from({length:4},(_,i)=>direction==='left'?line*4+i:direction==='right'?line*4+3-i:direction==='up'?i*4+line:(3-i)*4+line);
  const cells=indices.filter(i=>board[i]).map(from=>({from,value:board[from]}));let destination=0;
  for(let i=0;i<cells.length;i++){
   const a=cells[i],b=cells[i+1],to=indices[destination++];
   if(b&&a.value===b.value){next[to]=a.value*2;score+=next[to];merged.push(to);movements.push({from:a.from,to},{from:b.from,to});i++;}
   else{next[to]=a.value;movements.push({from:a.from,to});}
  }
 }
 return {board:next,score,movements,merged,moved:next.some((value,i)=>value!==board[i])};
}
function game2048Spawn(board,random=Math.random){
 const next=board.slice(),empty=next.map((value,i)=>value?null:i).filter(i=>i!==null);if(!empty.length)return {board:next,index:-1};
 const index=empty[Math.floor(random()*empty.length)];next[index]=random()<.9?2:4;return {board:next,index};
}
function game2048CanMove(board){return board.some((value,i)=>!value||(i%4<3&&value===board[i+1])||(i<12&&value===board[i+4]));}
const game2048={board:Array(16).fill(0),score:0,best:0,started:false,won:false,continued:false,over:false,moving:false,timer:null,storage:true};
try{const best=Number(localStorage.getItem('youwith.2048.best'));if(Number.isSafeInteger(best)&&best>=0)game2048.best=best;}catch{game2048.storage=false;}
function game2048StopMotion(){clearTimeout(game2048.timer);game2048.timer=null;game2048.moving=false;}
function game2048Create(){
 if(typeof recordGameScore==="function")recordGameScore("2048",game2048.score);
 game2048StopMotion();Object.assign(game2048,{board:game2048Spawn(game2048Spawn(Array(16).fill(0)).board).board,score:0,started:true,won:false,continued:false,over:false});
}
function game2048Start(){game2048Create();game2048Draw();game2048Status('새 게임을 시작했어요.');}
function game2048Status(text){const el=document.querySelector('#game2048-status');if(el)el.textContent=text;}
function game2048Reduced(){return document.documentElement?.dataset.reducedMotion==='true'||typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion:reduce)').matches;}
function game2048Move(direction){
 if(!['left','right','up','down'].includes(direction)||!game2048.started||game2048.moving||game2048.over||(game2048.won&&!game2048.continued))return;
 const result=game2048Slide(game2048.board,direction),name={left:'왼쪽',right:'오른쪽',up:'위',down:'아래'}[direction];
 if(!result.moved){game2048Status(`${name}로 움직일 수 없어요.`);return;}
 const spawned=game2048Spawn(result.board);game2048.board=spawned.board;game2048.score+=result.score;
 if(game2048.score>game2048.best){game2048.best=game2048.score;try{localStorage.setItem('youwith.2048.best',String(game2048.best));}catch{game2048.storage=false;}}
 game2048.won=game2048.board.some(value=>value>=2048);game2048.over=!game2048CanMove(game2048.board);
 const finish=()=>{game2048StopMotion();game2048Draw(spawned.index,result.merged);game2048Status(game2048.won&&!game2048.continued?'2048을 만들었어요! 계속하기를 누르면 이어서 할 수 있어요.':game2048.over?'게임이 끝났어요. 새로 시작할 수 있어요.':`${name} 이동${result.score?` · ${result.score}점 획득`:''}`);};
 const layer=document.querySelector('#game2048-tiles');
 if(!layer||game2048Reduced()){finish();return;}
 game2048.moving=true;
 for(const {from,to} of result.movements){const tile=layer.querySelector(`[data-cell="${from}"]`);if(tile){tile.style.setProperty('--column',to%4);tile.style.setProperty('--row',Math.floor(to/4));}}
 game2048.timer=setTimeout(finish,150);
}
function game2048Continue(){game2048.continued=true;game2048Draw();game2048Status(game2048.over?'움직일 수 있는 타일이 없어요. 새로 시작해주세요.':'2048 이후에도 계속할 수 있어요.');}
function game2048Screen(){
 if(!game2048.started)game2048Create();
 const arrow=path=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
 return `<section class="panel game2048-panel" aria-labelledby="game2048-title"><div class="section-heading"><h2 id="game2048-title">2048</h2><dl class="game2048-scores"><div><dt>점수</dt><dd id="game2048-score">${game2048.score}</dd></div><div><dt>최고 점수</dt><dd id="game2048-best">${game2048.best}</dd></div></dl></div><div class="game2048-layout"><div><div id="game2048-board" class="game2048-board" tabindex="0" role="group" aria-label="2048 게임판" aria-describedby="game2048-help"><div class="game2048-cells" aria-hidden="true">${'<span></span>'.repeat(16)}</div><div id="game2048-tiles" class="game2048-tiles" aria-hidden="true"></div><div id="game2048-overlay" class="game2048-overlay" hidden><h3 id="game2048-result"></h3><button type="button" class="primary" data-2048="continue" hidden>계속하기</button><button type="button" class="secondary" data-2048="start">새로 시작</button></div></div><table id="game2048-accessible" class="game2048-sr"><caption>2048 게임판 숫자</caption><tbody></tbody></table></div><div class="game2048-info"><p id="game2048-help">같은 숫자를 합쳐 2048을 만들어보세요.<br>방향키 또는 게임판 스와이프로 움직여요.</p><button type="button" class="primary game2048-restart" data-2048="start">새로 시작</button><div class="game2048-directions" role="group" aria-label="2048 이동 버튼"><button type="button" data-2048="up" aria-label="위로 이동">${arrow('M12 19V5m-6 6 6-6 6 6')}</button><button type="button" data-2048="left" aria-label="왼쪽으로 이동">${arrow('M19 12H5m6-6-6 6 6 6')}</button><button type="button" data-2048="down" aria-label="아래로 이동">${arrow('M12 5v14m-6-6 6 6 6-6')}</button><button type="button" data-2048="right" aria-label="오른쪽으로 이동">${arrow('M5 12h14m-6-6 6 6-6 6')}</button></div><p id="game2048-status" class="game2048-status sr-only" role="status" aria-live="polite">방향을 골라 시작해보세요.</p><p id="game2048-storage" class="small-muted"></p></div></div></section>`;
}
function game2048Draw(born=-1,merged=[]){
 if(typeof recordGameScore==="function")recordGameScore("2048",game2048.score);
 const layer=document.querySelector('#game2048-tiles');if(!layer)return;
 layer.innerHTML=game2048.board.map((value,i)=>value?`<div class="game2048-tile ${i===born?'tile-born':''} ${merged.includes(i)?'tile-merged':''}" data-cell="${i}" data-value="${value}" style="--column:${i%4};--row:${Math.floor(i/4)};--digits:${String(value).length}"><span>${value}</span></div>`:'').join('');
 document.querySelector('#game2048-score').textContent=game2048.score;document.querySelector('#game2048-best').textContent=game2048.best;
 document.querySelector('#game2048-storage').textContent=game2048.storage?'최고 점수는 이 브라우저에 저장돼요.':'최고 점수는 현재 화면에서만 유지돼요.';
 const overlay=document.querySelector('#game2048-overlay'),won=game2048.won&&!game2048.continued;overlay.hidden=!(won||game2048.over);document.querySelector('#game2048-result').textContent=won?'2048을 만들었어요!':'게임 종료';overlay.querySelector('[data-2048=continue]').hidden=!won;
 document.querySelector('#game2048-accessible tbody').innerHTML=Array.from({length:4},(_,r)=>'<tr>'+game2048.board.slice(r*4,r*4+4).map(value=>`<td>${value||'빈칸'}</td>`).join('')+'</tr>').join('');
}
function bind2048(root){
 const board=root.querySelector('#game2048-board');
 if(!board){if(page!=='game'||playgroundGame!=='2048')game2048StopMotion();return;}
 game2048StopMotion();game2048Draw();
 root.querySelectorAll('[data-2048]').forEach(button=>button.onclick=()=>{const action=button.dataset['2048'];if(action==='start')game2048Start();else if(action==='continue')game2048Continue();else game2048Move(action);});
 let swipe=null;
 board.onpointerdown=event=>{if(!event.isPrimary||event.button!==0||event.target.closest('button'))return;swipe={id:event.pointerId,x:event.clientX,y:event.clientY};board.setPointerCapture(event.pointerId);};
 board.onpointerup=event=>{if(!swipe||swipe.id!==event.pointerId)return;const dx=event.clientX-swipe.x,dy=event.clientY-swipe.y;swipe=null;if(board.hasPointerCapture(event.pointerId))board.releasePointerCapture(event.pointerId);if(Math.max(Math.abs(dx),Math.abs(dy))<18)return;game2048Move(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');};
 board.onpointercancel=()=>{swipe=null;};
}
document.addEventListener('keydown',event=>{
 if(page!=='game'||playgroundGame!=='2048'||event.altKey||event.ctrlKey||event.metaKey||event.target.isContentEditable||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)||document.querySelector('dialog[open]'))return;
 const direction={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'}[event.key];if(direction){event.preventDefault();game2048Move(direction);}
});
