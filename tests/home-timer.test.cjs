const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const context = vm.createContext({ seconds: 59 });
vm.runInContext(
  fs.readFileSync(__dirname + "/../frontend/screens.js", "utf8"),
  context,
);
const text = () =>
  vm.runInContext("timerText()", context).replace(/<[^>]+>/g, "");
assert.equal(text(), "1시간24분59초");
context.seconds = 60;
assert.equal(text(), "1시간25분00초");
context.seconds = 2160;
assert.equal(text(), "2시간00분00초");
