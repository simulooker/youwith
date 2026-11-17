const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../frontend/auth.js','utf8');
async function boot(preview,status){
  const calls=[],loaded=[],redirects=[];
  const c=vm.createContext({YOUWITH_PUBLIC_PREVIEW:preview,fetch:async url=>{calls.push(url);return {status,ok:status===200,json:async()=>({id:'approved-member',role:'member'})};},location:{hash:'#home',replace:url=>redirects.push(url)},sessionStorage:{setItem(){}},document:{hidden:false,createElement:()=>({}),body:{innerHTML:'',append:script=>{loaded.push(script.src);script.onload();},removeAttribute(){}},addEventListener(){}},setInterval(){}});
  c.window=c;await vm.runInContext(source,c);return {c,calls,loaded,redirects};
}
test('Public Pages boot never calls an API or impersonates an admin',async()=>{const r=await boot(true,404);assert.deepEqual(r.calls,[]);assert.equal(r.c.currentMember.role,'guest');assert.ok(r.loaded.some(file=>file.startsWith('app.js')));assert.equal(r.c.logout,undefined);});
test('Server mode retains login redirects',async()=>{const r=await boot(false,401);assert.deepEqual(r.redirects,['/login.html']);assert.equal(r.loaded.length,0);});
test('Server errors never silently disable authentication',async()=>{const r=await boot(false,503);assert.equal(r.c.currentMember,undefined);assert.equal(r.loaded.length,0);assert.ok(r.c.document.body.innerHTML.includes('사이트를 열 수 없어요.'));});
test('Approved server sessions still load the app',async()=>{const r=await boot(false,200);assert.equal(r.c.currentMember.role,'member');assert.ok(r.loaded.some(file=>file.startsWith('app.js')));assert.deepEqual(r.redirects,[]);});
