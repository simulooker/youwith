const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const c=vm.createContext({URL,URLSearchParams,Intl,Date});
vm.runInContext(fs.readFileSync(__dirname+'/../frontend/notice-board.js','utf8'),c);
vm.runInContext(fs.readFileSync(__dirname+'/../frontend/notice-calendar.js','utf8'),c);
c.NOTICE_DATA=JSON.parse(fs.readFileSync(__dirname+'/../frontend/notices.json','utf8'));
c.escapeHTML=x=>String(x);c.icon=()=>'';
// Fix availability in this grouping fixture; live network failures are not grouping regressions.
for(const source of c.NOTICE_DATA.sources) {
  if(['nccoss','semiconductor','software'].includes(source.id))source.status='verified';
  else if(['grow','career','education'].includes(source.id)){source.status='partial';source.collectionScope='public-home-list';}
  else if(source.id!=='other')source.status='link-only';
}
const groups=vm.runInContext('NOTICE_SOURCE_GROUPS',c);
assert.equal(groups.length,3);
assert.deepEqual(Array.from(groups[2].sources),['allcon','kstartup','mss','msit']);
assert.equal(vm.runInContext('noticeSourceCatalog().length',c),15);
assert.equal(vm.runInContext('noticeSources().length',c),9);
const markup=vm.runInContext('sourceCheckboxes()',c);
assert.equal((markup.match(/data-source-group=/g)||[]).length,3);
assert.ok(!markup.includes('data-notice-source="other"'));
assert.equal((markup.match(/\(미지원\)/g)||[]).length,6);
for(const id of ['kstartup','mss','msit'])assert.ok(markup.includes(`data-notice-source="${id}"`));
const note=(providerId,category,n)=>({providerId,category,title:`AI 유형별 필터 테스트 ${n}`,url:`https://example.org/${providerId}/${n}`,startsAt:'2099-01-01',endsAt:'2099-12-01'});
c.fixture=[note('kstartup','교육·체험',1),note('mss','지원·장학',2),note('msit','대회·공모전',3)];
vm.runInContext('NOTICE_DATA.sources.find(s=>s.id==="other").notices=fixture;enabledNoticeSources=new Set(["kstartup","mss","msit"]);enabledNoticeTypes=new Set(["교육·체험"])',c);
assert.deepEqual(Array.from(vm.runInContext('calendarNotices().map(n=>n.providerId)',c)),['kstartup']);
vm.runInContext('enabledNoticeTypes=new Set(["지원·장학"])',c);
assert.deepEqual(Array.from(vm.runInContext('calendarNotices().map(n=>n.providerId)',c)),['mss']);
vm.runInContext('enabledNoticeTypes=new Set(["대회·공모전"])',c);
assert.deepEqual(Array.from(vm.runInContext('calendarNotices().map(n=>n.providerId)',c)),['msit']);
vm.runInContext('enabledNoticeSources.delete("msit")',c);
assert.equal(vm.runInContext('calendarNotices().length',c),0);
vm.runInContext('enabledNoticeTypes=new Set(NOTICE_CATEGORIES.map(x=>x[0]));enabledNoticeSources=new Set(["kstartup","mss"])',c);
assert.deepEqual(Array.from(vm.runInContext('calendarNotices().map(n=>n.providerId)',c)),['kstartup','mss']);
assert.equal((vm.runInContext('noticeGroups()',c).match(/class="notice-row"/g)||[]).length,2);
console.log('Three source groups, four external providers, independent API toggles and per-notice type filters passed.');
