const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(__dirname + "/../frontend/app.js", "utf8");
const start = source.indexOf("function navigationDirection(");
const end = source.indexOf('window.addEventListener("hashchange"', start);
const context = vm.createContext({
  menu: [["home"], ["study"], ["game"], ["activity"], ["profile"]],
});
vm.runInContext(source.slice(start, end), context);
assert.equal(
  vm.runInContext("navigationDirection('home','activity')", context),
  "forward",
);
assert.equal(
  vm.runInContext("navigationDirection('profile','study')", context),
  "backward",
);
assert.equal(
  vm.runInContext("navigationDirection('settings','game')", context),
  "backward",
);
