const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
let tick;
const fill = { style: {} },
  progress = {
    value: 60,
    setAttribute(key, value) {
      if (key === "aria-valuenow") this.value = +value;
    },
    querySelector() {
      return fill;
    },
  };
const document = {
  hidden: false,
  querySelector(selector) {
    return selector === "#game-progress" ? progress : { textContent: "" };
  },
};
const context = vm.createContext({
  document,
  page: "game",
  render() {},
  toast() {},
  clearInterval() {},
  setInterval(fn) {
    tick = fn;
  },
});
vm.runInContext(
  fs.readFileSync(__dirname + "/../frontend/game.js", "utf8"),
  context,
);
vm.runInContext("startGame()", context);
tick();
assert.equal(progress.value, 59);
assert.equal(fill.style.transform, `scaleX(${59 / 60})`);
document.hidden = true;
tick();
assert.equal(progress.value, 59);
document.hidden = false;
for (let n = 0; n < 59; n++) tick();
assert.equal(progress.value, 0);
assert.equal(fill.style.transform, "scaleX(0)");
assert.equal(vm.runInContext("gameStarted", context), false);
