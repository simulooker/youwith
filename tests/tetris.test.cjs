const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c=vm.createContext({document:{addEventListener(){},querySelector(){return null;}},cancelAnimationFrame(){},requestAnimationFrame(){return 1;}});
vm.runInContext(fs.readFileSync(__dirname+'/../frontend/tetris.js','utf8'),c);
assert.equal(vm.runInContext('new Set(tetrisBag()).size',c),7);
assert.equal(vm.runInContext('tetrisBag().length',c),7);
vm.runInContext('tetrisStart()',c);
assert.equal(vm.runInContext('tetris.board.length',c),20);
assert.ok(vm.runInContext('tetrisFits(tetris.board,tetris.piece.matrix,tetris.piece.x,tetris.piece.y)',c));
assert.equal(vm.runInContext('tetrisFits(tetris.board,[[1]],-1,0)',c),false);
assert.equal(vm.runInContext('tetrisFits(tetris.board,[[1]],10,0)',c),false);
assert.equal(vm.runInContext('tetrisFits(tetris.board,[[1]],0,20)',c),false);
assert.ok(vm.runInContext('JSON.stringify(TETRIS_SHAPES.T)===JSON.stringify([1,2,3,4].reduce(m=>tetrisRotateMatrix(m),TETRIS_SHAPES.T))',c));
vm.runInContext('tetris.board[19].fill("J");tetris.board[18].fill("J")',c);
assert.equal(vm.runInContext('tetrisClearLines(tetris.board)',c),2);
assert.equal(vm.runInContext('tetris.board.length',c),20);
assert.ok(vm.runInContext('tetris.board[0].every(cell=>cell===null)',c));
vm.runInContext('tetrisStart();tetrisHardDrop()',c);
assert.ok(vm.runInContext('tetris.score>0 && tetris.board.some(row=>row.some(Boolean))',c));
vm.runInContext('tetrisPause(true);const beforeY=tetris.piece.y;tetrisDrop(true)',c);
assert.equal(vm.runInContext('tetris.piece.y===beforeY',c),true);
vm.runInContext('tetrisPause(false);tetrisStart();tetris.board.forEach(row=>row.fill("T"));tetrisSpawn()',c);
assert.equal(vm.runInContext('tetris.running',c),false);assert.equal(vm.runInContext('tetris.over',c),true);
console.log('Tetris seven-bag, collisions, rotations, simultaneous line clear, drop score, pause and game-over passed.');

// Contact delays locking; successful movement and rotation reset the timer.
vm.runInContext("tetrisStart();tetris.piece={kind:'O',matrix:[[1,1],[1,1]],x:4,y:18};tetrisDrop(true)",c);
assert.equal(vm.runInContext('tetris.board.flat().some(Boolean)',c),false);
vm.runInContext("page='game';playgroundGame='tetris';tetris.frameAt=1000;tetris.last=1000;tetrisFrame(1400)",c);
assert.equal(vm.runInContext('tetris.lockElapsed',c),400);
vm.runInContext('tetrisMove(-1)',c);assert.equal(vm.runInContext('tetris.lockElapsed',c),0);
vm.runInContext('tetris.lockElapsed=400;tetrisRotate()',c);assert.equal(vm.runInContext('tetris.lockElapsed',c),0);
vm.runInContext('tetrisFrame(1800)',c);assert.equal(vm.runInContext('tetris.board.flat().some(Boolean)',c),false);
vm.runInContext('tetrisFrame(1950)',c);assert.equal(vm.runInContext('tetris.board.flat().some(Boolean)',c),true);
// First hold consumes next, second hold is blocked, locking permits a swap without consuming next.
vm.runInContext('tetrisStart();const first=tetris.piece.kind,queued=tetris.next;tetrisHold()',c);
assert.equal(vm.runInContext('tetris.held===first && tetris.piece.kind===queued',c),true);
vm.runInContext('const heldPiece=tetris.piece;tetrisHold()',c);assert.equal(vm.runInContext('tetris.piece===heldPiece',c),true);
vm.runInContext('tetrisHardDrop();const nextBefore=tetris.next,kindBefore=tetris.piece.kind;tetrisHold()',c);
assert.equal(vm.runInContext('tetris.next===nextBefore && tetris.piece.kind===first && tetris.held===kindBefore',c),true);
