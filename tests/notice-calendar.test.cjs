const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const context = vm.createContext({ Intl, Date });
vm.runInContext(
  fs.readFileSync(__dirname + "/../frontend/notice-board.js", "utf8"),
  context,
);
vm.runInContext(
  fs.readFileSync(__dirname + "/../frontend/notice-calendar.js", "utf8"),
  context,
);
const items = [
  { title: "A", startsAt: "2026-11-10", endsAt: "2026-11-20" },
  { title: "B", startsAt: null, endsAt: "2026-11-20" },
];
context.items = items;
assert.equal(
  vm.runInContext("noticesOnDay(items,'2026-11-10').length", context),
  1,
);
assert.equal(
  vm.runInContext("noticesOnDay(items,'2026-11-20').length", context),
  2,
);
assert.equal(
  vm.runInContext("noticesOnDay(items,'2026-11-21').length", context),
  0,
);
context.source = {
  name: "전자컴퓨터",
  notices: [
    { title: "AI 모집", category: "교육·체험", endsAt: "2000-01-01" },
    { title: "AI 모집", category: "교육·체험", endsAt: null },
    { title: "AI 모집", category: "교육·체험", endsAt: "2099-01-01" },
  ],
};
assert.equal(vm.runInContext("filteredNotices(source).length", context), 2);
vm.runInContext("noticeStatus='unknown'", context);
assert.equal(vm.runInContext("filteredNotices(source).length", context), 1);
assert.equal(
  vm.runInContext("filteredNotices(source)[0].endsAt", context),
  null,
);
context.periods = [
  { title: "A", startsAt: "2026-11-01", endsAt: "2026-11-12" },
  { title: "B", startsAt: "2026-11-10", endsAt: "2026-11-15" },
  { title: "C", startsAt: null, endsAt: "2026-11-13" },
];
const segments = vm.runInContext(
  "calendarWeekSegments(periods,'2026-11-08','2026-11-14','2026-11-01','2026-11-30')",
  context,
);
assert.equal(segments[0].column, 1);
assert.equal(segments[0].span, 5);
assert.notEqual(segments[0].lane, segments[1].lane);
assert.equal(segments.find((s) => s.item.title === "C").span, 1);
assert.equal(segments.find((s) => s.item.title === "C").column, 6);
context.NOTICE_DATA = JSON.parse(
  fs.readFileSync(__dirname + "/../frontend/notices.json", "utf8"),
);
// Keep calendar filtering independent of live source availability.
for (const source of context.NOTICE_DATA.sources) {
  if (['nccoss', 'semiconductor', 'software'].includes(source.id)) source.status = 'verified';
  else if (['grow', 'career', 'education'].includes(source.id)) {
    source.status = 'partial';
    source.collectionScope = 'public-home-list';
  } else if (source.id !== 'other') source.status = 'link-only';
}
context.escapeHTML = (text) => String(text);
context.icon = () => "";
assert.equal(vm.runInContext("noticeSources().length", context), 9);
const checkboxes = vm.runInContext("sourceCheckboxes()", context);
assert.equal((checkboxes.match(/type="checkbox"/g) || []).length, 9);
assert.equal((checkboxes.match(/\(미지원\)/g) || []).length, 5);
vm.runInContext("enabledNoticeSources.clear()", context);
assert.equal(vm.runInContext("noticeSources().length", context), 0);
vm.runInContext("noticeStatus='active';enabledNoticeTypes.clear()", context);
assert.equal(vm.runInContext("filteredNotices(source).length", context), 0);
vm.runInContext("enabledNoticeTypes.add('교육·체험')", context);
assert.equal(vm.runInContext("filteredNotices(source).length", context), 1);
