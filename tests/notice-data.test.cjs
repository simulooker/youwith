const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const context = vm.createContext({});
vm.runInContext(
  fs.readFileSync(__dirname + "/../frontend/notice-data.js", "utf8"),
  context,
);
const data = vm.runInContext("NOTICE_DATA", context);
assert.equal(data.sources.length, 12);
assert.equal(new Set(data.sources.map((source) => source.id)).size, 12);
for (const source of data.sources) {
  for (const notice of source.notices) {
    assert.ok(notice.title.trim());
    const url = new URL(notice.url); // RSS relative paths must resolve to the institution, never localhost.
    assert.ok(["http:", "https:"].includes(url.protocol));
    assert.notEqual(url.hostname, "127.0.0.1");
  }
}
assert.equal(
  data.sources.find((source) => source.id === "allcon").status,
  "link-only",
);
const notices = data.sources.flatMap((source) => source.notices);
assert.ok(!notices.some((item) => /현황조/.test(item.title)));
for (const item of notices.filter((item) => /채용/.test(item.title))) {
  assert.equal(item.category, "인턴·취업");
}
console.log(
  "12 distinct sources, external notice URLs and restricted-source labels passed.",
);
