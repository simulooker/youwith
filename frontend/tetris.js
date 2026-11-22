// 테트리스 규칙과 입력은 이 파일에서 관리합니다. 기록은 현재 플레이 동안 유지합니다.
let playgroundGame='apple';
const TETRIS_SHAPES={I:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],O:[[1,1],[1,1]],T:[[0,1,0],[1,1,1],[0,0,0]],S:[[0,1,1],[1,1,0],[0,0,0]],Z:[[1,1,0],[0,1,1],[0,0,0]],J:[[1,0,0],[1,1,1],[0,0,0]],L:[[0,0,1],[1,1,1],[0,0,0]]};
const TETRIS_COLORS={I:'#267d8a',O:'#ad7b20',T:'#8256a4',S:'#3d7a5d',Z:'#bd4f3c',J:'#4265a2',L:'#bd6b30'};
function tetrisBag(random=Math.random) {
  const bag=Object.keys(TETRIS_SHAPES);
  for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
  return bag;
}
const tetris={board:[],piece:null,next:null,bag:[],score:0,lines:0,level:1,running:false,paused:false,over:false,raf:null,last:0,frameAt:0,lockElapsed:0,held:null,holdUsed:false};
function tetrisTake(){if(!tetris.bag.length)tetris.bag=tetrisBag();return tetris.bag.pop();}
function tetrisFits(board,matrix,x,y) {
  return matrix.every((row,dy)=>row.every((cell,dx)=>!cell || (x+dx>=0 && x+dx<10 && y+dy<20 && (y+dy<0 || !board[y+dy][x+dx]))));
}
function tetrisRotateMatrix(matrix){return matrix[0].map((_,x)=>matrix.map(row=>row[x]).reverse());}
function tetrisClearLines(board){let cleared=0;for(let y=board.length-1;y>=0;y--)if(board[y].every(Boolean)){board.splice(y,1);board.unshift(Array(10).fill(null));cleared++;y++;}return cleared;}
function tetrisSpawn(heldKind){const kind=heldKind||tetris.next||tetrisTake();if(!heldKind)tetris.next=tetrisTake();tetris.lockElapsed=0;tetris.last=0;tetris.piece={kind,matrix:TETRIS_SHAPES[kind].map(row=>row.slice()),x:kind==='O'?4:3,y:0};if(!tetrisFits(tetris.board,tetris.piece.matrix,tetris.piece.x,0)){tetris.running=false;tetris.over=true;}}
function tetrisStart(){if(typeof recordGameScore==="function")recordGameScore("tetris",tetris.score);cancelAnimationFrame(tetris.raf);Object.assign(tetris,{board:Array.from({length:20},()=>Array(10).fill(null)),piece:null,next:null,bag:[],score:0,lines:0,level:1,running:true,paused:false,over:false,last:0,frameAt:0,lockElapsed:0,held:null,holdUsed:false});tetrisSpawn();tetrisDraw();tetrisLoopStart();if(typeof innerWidth!=="undefined"&&innerWidth<=600)document.querySelector(".tetris-panel")?.scrollIntoView({block:"start",behavior:"instant"});}
function tetrisLock(){
  const p=tetris.piece;
  for(let y=0;y<p.matrix.length;y++)for(let x=0;x<p.matrix[y].length;x++)if(p.matrix[y][x]){
    if(p.y+y<0){tetris.running=false;tetris.over=true;return;}
    tetris.board[p.y+y][p.x+x]=p.kind;
  }
  const cleared=tetrisClearLines(tetris.board);
  tetris.score+=[0,100,300,500,800][cleared]*tetris.level;tetris.lines+=cleared;tetris.level=1+Math.floor(tetris.lines/10);tetris.holdUsed=false;tetrisSpawn();
}
function tetrisMove(dx){if(!tetris.running||tetris.paused)return;const p=tetris.piece;if(tetrisFits(tetris.board,p.matrix,p.x+dx,p.y)){p.x+=dx;tetris.lockElapsed=0;}tetrisDraw();}
function tetrisDrop(manual=false){if(!tetris.running||tetris.paused)return;const p=tetris.piece;if(tetrisFits(tetris.board,p.matrix,p.x,p.y+1)){p.y++;if(manual)tetris.score++;}tetrisDraw();}
function tetrisHardDrop(){if(!tetris.running||tetris.paused)return;const p=tetris.piece;while(tetrisFits(tetris.board,p.matrix,p.x,p.y+1)){p.y++;tetris.score+=2;}tetrisLock();tetris.last=0;tetrisDraw();}
function tetrisRotate(){if(!tetris.running||tetris.paused)return;const p=tetris.piece,matrix=tetrisRotateMatrix(p.matrix);for(const [dx,dy] of [[0,0],[-1,0],[1,0],[-2,0],[2,0],[0,-1],[0,-2]])if(tetrisFits(tetris.board,matrix,p.x+dx,p.y+dy)){p.matrix=matrix;p.x+=dx;p.y+=dy;tetris.lockElapsed=0;break;}tetrisDraw();}
function tetrisPause(force){if(!tetris.running)return;tetris.paused=typeof force==='boolean'?force:!tetris.paused;cancelAnimationFrame(tetris.raf);tetris.last=0;tetris.frameAt=0;tetrisDraw();if(!tetris.paused)tetrisLoopStart();}
function tetrisLoopStart(){cancelAnimationFrame(tetris.raf);tetris.raf=requestAnimationFrame(tetrisFrame);}
function tetrisFrame(now){
  if(!tetris.running||tetris.paused||page!=='game'||playgroundGame!=='tetris')return;
  if(document.hidden){tetrisPause(true);return;}
  const delta=tetris.frameAt?Math.max(0,now-tetris.frameAt):0;tetris.frameAt=now;
  const p=tetris.piece,grounded=!tetrisFits(tetris.board,p.matrix,p.x,p.y+1);
  if(!tetris.last)tetris.last=now;
  if(now-tetris.last>=Math.max(90,800-(tetris.level-1)*65)){tetrisDrop();tetris.last=now;}
  if(grounded){tetris.lockElapsed+=delta;if(tetris.lockElapsed>=500){tetrisLock();tetrisDraw();}}
  else tetris.lockElapsed=0;
  if(tetris.running&&!tetris.paused)tetris.raf=requestAnimationFrame(tetrisFrame);
}
function tetrisHold(){
 if(!tetris.running||tetris.paused||tetris.holdUsed)return;
 const kind=tetris.piece.kind,previous=tetris.held;tetris.held=kind;
 tetrisSpawn(previous);tetris.holdUsed=true;tetrisDraw();
}
function tetrisKey(name){
 const arrows={left:'M19 12H5m6-6-6 6 6 6',right:'M5 12h14m-6-6 6 6-6 6',up:'M12 19V5m-6 6 6-6 6 6',down:'M12 5v14m-6-6 6 6 6-6'};
 return `<kbd class="tetris-key">${arrows[name]?`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${arrows[name]}"/></svg><span class="sr-only">${{left:'왼쪽',right:'오른쪽',up:'위쪽',down:'아래쪽'}[name]} 방향키</span>`:name}</kbd>`;
}
function tetrisScreen(){
  return `<section class="panel tetris-panel"><div class="section-heading"><h2>테트리스</h2><span id="tetris-status" role="status">시작하기를 눌러주세요.</span></div><div class="tetris-actions"><button type="button" class="primary" data-tetris="start">${tetris.running?'새로 시작':'게임 시작하기'}</button><button type="button" class="secondary" data-tetris="pause" ${tetris.running?'':'disabled'}>일시정지</button></div><div class="tetris-layout"><div><canvas id="tetris-board" width="240" height="480" tabindex="0" aria-label="테트리스 게임판. 좌우 화살표 이동, 위 화살표 회전, 아래 화살표 빠르게 내리기, 스페이스 즉시 내리기, C 블록 저장, P 일시정지"></canvas><div class="tetris-controls" aria-label="테트리스 조작"><button type="button" data-tetris="left" aria-label="왼쪽 이동">${tetrisKey("left")}</button><button type="button" data-tetris="rotate" aria-label="블록 회전">${tetrisKey("up")}</button><button type="button" data-tetris="right" aria-label="오른쪽 이동">${tetrisKey("right")}</button><button type="button" data-tetris="down" aria-label="한 칸 내리기">${tetrisKey("down")}</button><button type="button" data-tetris="hold">C · 저장</button><button type="button" data-tetris="drop">즉시 내리기</button></div></div><div class="tetris-info"><dl><div><dt>점수</dt><dd id="tetris-score">${tetris.score}</dd></div><div><dt>지운 줄</dt><dd id="tetris-lines">${tetris.lines}</dd></div><div><dt>레벨</dt><dd id="tetris-level">${tetris.level}</dd></div></dl><div class="tetris-next"><strong>저장 블록 (C)</strong><canvas id="tetris-held" width="96" height="96" aria-label="저장한 블록"></canvas></div><div class="tetris-next"><strong>다음 블록</strong><canvas id="tetris-next" width="96" height="96" aria-label="다음 블록 미리보기"></canvas></div><dl class="tetris-key-help">${[
 [tetrisKey('left')+tetrisKey('right'),'좌우 이동'],[tetrisKey('up'),'시계 방향 회전'],[tetrisKey('down'),'빠르게 내리기'],[tetrisKey('Space'),'즉시 배치'],[tetrisKey('C'),'블록 저장·교환 (배치 전 1회)'],[tetrisKey('P'),'일시정지·계속하기']
 ].map(([key,help])=>`<div><dt>${key}</dt><dd>: ${help}</dd></div>`).join('')}</dl><p class="small-muted">착지 후 0.5초 뒤 고정돼요. 이동·회전하면 대기시간이 다시 시작돼요.</p><p class="small-muted">화면을 떠나면 일시정지돼요.</p></div></div></section>`;
}
function playgroundTabs(){return `<div class="filters playground-tabs" role="group" aria-label="게임 선택"><button class="filter ${playgroundGame==='apple'?'selected':''}" data-playground="apple" aria-pressed="${playgroundGame==='apple'}">사과게임</button><button class="filter ${playgroundGame==='tetris'?'selected':''}" data-playground="tetris" aria-pressed="${playgroundGame==='tetris'}">테트리스</button><button class="filter ${playgroundGame==='2048'?'selected':''}" data-playground="2048" aria-pressed="${playgroundGame==='2048'}">2048</button></div>`;}
function tetrisDraw(){
  if(typeof recordGameScore==="function")recordGameScore("tetris",tetris.score);
  const canvas=document.querySelector('#tetris-board');if(!canvas)return;
  const ctx=canvas.getContext('2d'),size=24;ctx.fillStyle='#17201b';ctx.fillRect(0,0,240,480);
  const cell=(x,y,kind,alpha=1)=>{ctx.globalAlpha=alpha;ctx.fillStyle=TETRIS_COLORS[kind];ctx.fillRect(x*size+1,y*size+1,size-2,size-2);ctx.fillStyle='#ffffff40';ctx.fillRect(x*size+2,y*size+2,size-4,3);ctx.globalAlpha=1;};
  for(let y=0;y<20;y++)for(let x=0;x<10;x++){ctx.strokeStyle='#ffffff12';ctx.strokeRect(x*size,y*size,size,size);if(tetris.board[y]?.[x])cell(x,y,tetris.board[y][x]);}
  if(tetris.piece&&!tetris.over){const p=tetris.piece;let ghost=p.y;while(tetrisFits(tetris.board,p.matrix,p.x,ghost+1))ghost++;for(let y=0;y<p.matrix.length;y++)for(let x=0;x<p.matrix[y].length;x++)if(p.matrix[y][x]){cell(p.x+x,ghost+y,p.kind,.25);cell(p.x+x,p.y+y,p.kind);}}
  const status=tetris.over?'게임 종료':tetris.running?(tetris.paused?'일시정지':'플레이 중'):'시작하기를 눌러주세요.';
  if(tetris.paused||tetris.over){ctx.fillStyle='#17201bd9';ctx.fillRect(0,190,240,100);ctx.fillStyle='#fafbf9';ctx.font='bold 22px sans-serif';ctx.textAlign='center';ctx.fillText(status,120,245);}
  document.querySelector('#tetris-status').textContent=status;
  document.querySelector('[data-tetris=start]').textContent=tetris.running?'새로 시작':tetris.over?'다시 시작':'게임 시작하기';
  for(const key of ['score','lines','level'])document.querySelector('#tetris-'+key).textContent=tetris[key];
  const pause=document.querySelector('[data-tetris=pause]');pause.disabled=!tetris.running;pause.textContent=tetris.paused?'계속하기':'일시정지';
  const held=document.querySelector('#tetris-held');
  if(held){const hctx=held.getContext('2d');hctx.clearRect(0,0,96,96);if(tetris.held){hctx.fillStyle=TETRIS_COLORS[tetris.held];const shape=TETRIS_SHAPES[tetris.held],offset=(96-shape.length*20)/2;shape.forEach((row,y)=>row.forEach((cell,x)=>{if(cell)hctx.fillRect(offset+x*20+1,offset+y*20+1,18,18);}));}}
  const hold=document.querySelector('[data-tetris=hold]');if(hold)hold.disabled=!tetris.running||tetris.paused||tetris.holdUsed;
  const next=document.querySelector('#tetris-next'),nctx=next.getContext('2d');nctx.clearRect(0,0,96,96);
  if(tetris.next){nctx.fillStyle=TETRIS_COLORS[tetris.next];const matrix=TETRIS_SHAPES[tetris.next],offset=(96-matrix.length*20)/2;matrix.forEach((row,y)=>row.forEach((v,x)=>{if(v)nctx.fillRect(offset+x*20+1,offset+y*20+1,18,18);}));}
}
function bindTetris(root){
  root.querySelectorAll('[data-playground]').forEach(button=>button.onclick=()=>{if(playgroundGame===button.dataset.playground)return;tetrisPause(true);playgroundGame=button.dataset.playground;render();});
  if(page!=='game'||playgroundGame!=='tetris'){tetrisPause(true);return;}
  const actions={left:()=>tetrisMove(-1),right:()=>tetrisMove(1),rotate:tetrisRotate,down:()=>tetrisDrop(true),drop:tetrisHardDrop,hold:tetrisHold,start:tetrisStart,pause:tetrisPause};
  root.querySelectorAll('[data-tetris]').forEach(button=>button.onclick=()=>actions[button.dataset.tetris]());tetrisDraw();
  if(tetris.running&&!tetris.paused)tetrisLoopStart();
}
document.addEventListener('keydown',event=>{
  if(page!=='game'||playgroundGame!=='tetris'||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || (event.target.tagName==='BUTTON'&&event.code==='Space'))return;
  if(event.code==='KeyP'){event.preventDefault();tetrisPause();return;}
  if(!tetris.running||tetris.paused)return;
  const actions={ArrowLeft:()=>tetrisMove(-1),ArrowRight:()=>tetrisMove(1),ArrowUp:tetrisRotate,ArrowDown:()=>tetrisDrop(true),Space:tetrisHardDrop,KeyC:tetrisHold};
  if(actions[event.code]){event.preventDefault();if(event.repeat&&['Space','ArrowUp','KeyC'].includes(event.code))return;actions[event.code]();}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)tetrisPause(true);});
