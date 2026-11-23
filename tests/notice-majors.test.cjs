const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const c=vm.createContext({});
vm.runInContext(fs.readFileSync(__dirname+'/../frontend/notice-board.js','utf8'),c);
vm.runInContext(fs.readFileSync(__dirname+'/../frontend/notice-calendar.js','utf8'),c);
c.source={name:'전자컴퓨터공학부',notices:[
 {title:'AI 해커톤 모집',category:'대회·공모전',endsAt:'2099-12-01'},
 {title:'전자회로 설계 교육',category:'교육·체험',endsAt:'2099-12-01'},
 {title:'반도체 RTL 설계 모집',category:'모집·프로그램',endsAt:'2099-12-01'},
 {title:'전자문서 서명 제출 안내',category:'교육·체험',endsAt:'2099-12-01'},
 {title:'AICOSS 일반 장학 모집',category:'지원·장학',endsAt:'2099-12-01'}
]};
vm.runInContext('noticeStatus="active"',c);
assert.equal(vm.runInContext('filteredNotices(source).length',c),5);
vm.runInContext('selectedNoticeMajors.add("computer")',c);
assert.deepEqual(Array.from(vm.runInContext('filteredNotices(source).map(x=>x.title)',c)),['AI 해커톤 모집']);
vm.runInContext('selectedNoticeMajors.add("semiconductor")',c);
assert.equal(vm.runInContext('filteredNotices(source).length',c),3);
vm.runInContext('enabledNoticeTypes.delete("대회·공모전")',c);
assert.deepEqual(Array.from(vm.runInContext('filteredNotices(source).map(x=>x.title)',c)),['전자회로 설계 교육','반도체 RTL 설계 모집']);
vm.runInContext('selectedNoticeMajors.clear();selectedNoticeMajors.add("electronics")',c);
assert.equal(vm.runInContext('filteredNotices(source).length',c),2);
assert.deepEqual(Array.from(vm.runInContext('filteredNotices(source).map(x=>x.title)',c)),['전자회로 설계 교육','반도체 RTL 설계 모집']);
vm.runInContext('selectedNoticeMajors.clear()',c);
assert.equal(vm.runInContext('filteredNotices(source).length',c),4);
assert.equal(vm.runInContext('sourceSupported({status:"partial",collectionScope:"public-home-list"})',c),false);
assert.equal(vm.runInContext('sourceSupported({status:"partial"})',c),false);
console.log('Major filter OR/AND composition, Latin boundaries, unrelated institution names and partial-source gating passed.');

assert.deepEqual(Array.from(vm.runInContext('NOTICE_MAJORS.map(m=>m.label)',c)),['컴퓨터정보통신공학전공','전자공학전공','시스템반도체공학전공']);
c.overlap={title:'임베디드 FPGA 신호처리 교육',category:'교육·체험',endsAt:'2099-12-01'};
for(const id of ['computer','electronics','semiconductor']) {
  c.majorId=id;
  assert.ok(vm.runInContext('noticeMajorMatches(overlap,NOTICE_MAJORS.find(m=>m.id===majorId)).length>0',c));
}
assert.ok(vm.runInContext('noticeMajorMatches({title:"6G 네트워크 교육"},NOTICE_MAJORS[0]).includes("6G")',c));
assert.ok(!vm.runInContext('noticeMajorMatches({title:"X6GZ AICOSS"},NOTICE_MAJORS[0]).includes("6G")',c));
assert.ok(vm.runInContext('noticeMajorMatches({title:"웨이퍼 식각 TCAD 설계"},NOTICE_MAJORS[2]).length>=3',c));
c.source={name:'학교',notices:[c.overlap]};
vm.runInContext('enabledNoticeTypes=new Set(NOTICE_CATEGORIES.map(x=>x[0]));selectedNoticeMajors.clear();NOTICE_MAJORS.forEach(m=>selectedNoticeMajors.add(m.id))',c);
assert.equal(vm.runInContext('filteredNotices(source).length',c),1);
