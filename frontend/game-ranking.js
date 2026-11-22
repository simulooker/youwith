// Server mode shares authenticated personal bests. Static hosting keeps a browser-only record.
const gameRankings={},gameScoreTimers={},gamePendingScores={},gameSentScores={};
function gameRankingPanel(game){
 const title=game==='tetris'?'테트리스':'2048';
 return `<section class="panel game-ranking" data-game-ranking="${game}"><div class="section-heading"><h2>${title} 순위</h2>${icon('cup')}</div><div class="game-ranking-rows"></div><p class="small-muted game-ranking-note"></p></section>`;
}
function paintGameRanking(game){
 const panel=document.querySelector(`[data-game-ranking="${game}"]`);if(!panel)return;
 const data=gameRankings[game];
 panel.querySelector('.game-ranking-rows').innerHTML=data?.rows?.length?data.rows.map(row=>`<div class="rank-row ${row.mine?'my-game-rank':''}"><span class="rank-number">${row.rank}</span><span class="rank-name">${escapeHTML(row.username)}${row.mine?' · 나':''}</span><strong>${row.score.toLocaleString()}점</strong></div>`).join(''):'<p class="empty-note">아직 기록이 없어요. 첫 기록을 남겨보세요.</p>';
 panel.querySelector('.game-ranking-note').textContent=data?.error|| (window.YOUWITH_PUBLIC_PREVIEW?'이 브라우저의 개인 최고 기록이에요.':'회원별 최고 점수 · 높은 점수순');
 if(data?.me&&data.me.rank>20)panel.querySelector('.game-ranking-note').textContent+=` · 내 순위 ${data.me.rank}위`;
}
async function loadGameRanking(game){
 if(window.YOUWITH_PUBLIC_PREVIEW){
  let score=0;try{score=Number(localStorage.getItem(`youwith.${game}.best`))||0;}catch{}
  gameRankings[game]={rows:score?[{rank:1,username:'나',score,mine:true}]:[]};
 }else try{
  const response=await fetch(`/api/games/${game}/ranking`,{cache:'no-store'});if(!response.ok)throw Error();
  gameRankings[game]=await response.json();
 }catch{gameRankings[game]={...gameRankings[game],error:'순위를 불러오지 못했어요. 다시 열어주세요.'};}
 paintGameRanking(game);
}
function recordGameScore(game,score){
 if(!Number.isSafeInteger(score)||score<=0)return;
 if(score<=(gamePendingScores[game]||0))return;
 gamePendingScores[game]=score;
 if(window.YOUWITH_PUBLIC_PREVIEW){
  let best=score;try{best=Math.max(score,Number(localStorage.getItem(`youwith.${game}.best`))||0);localStorage.setItem(`youwith.${game}.best`,String(best));}catch{}
  gameRankings[game]={rows:[{rank:1,username:'나',score:best,mine:true}]};paintGameRanking(game);return;
 }
 clearTimeout(gameScoreTimers[game]);gameScoreTimers[game]=setTimeout(()=>flushGameScore(game),750);
}
async function flushGameScore(game){
 clearTimeout(gameScoreTimers[game]);const score=gamePendingScores[game];
 if(!score||score<=(gameSentScores[game]||0)||window.YOUWITH_PUBLIC_PREVIEW)return;
 try{
  const response=await fetch(`/api/games/${game}/score`,{method:'POST',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({score})});
  if(!response.ok)throw Error();gameRankings[game]=await response.json();gameSentScores[game]=Math.max(score,gameSentScores[game]||0);
 }catch{gameRankings[game]={...gameRankings[game],error:'점수를 저장하지 못했어요. 순위를 다시 열면 재시도해요.'};}
 paintGameRanking(game);
}
function bindGameRankings(){
 document.querySelectorAll('[data-game-ranking]').forEach(panel=>{const game=panel.dataset.gameRanking;paintGameRanking(game);loadGameRanking(game);flushGameScore(game);});
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)for(const game of ['tetris','2048'])flushGameScore(game);});
window.addEventListener('pagehide',()=>{for(const game of ['tetris','2048'])flushGameScore(game);});
