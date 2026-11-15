const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const context = vm.createContext({
  clearInterval() {},
  setInterval() {},
  render() {},
});
vm.runInContext(
  fs.readFileSync(__dirname + "/../frontend/game.js", "utf8"),
  context,
);
vm.runInContext("startGame()", context);
const values = vm.runInContext("gameValues", context);
assert.equal(values.length, 144);
assert.ok(values.every((n) => Number.isInteger(n) && n >= 1 && n <= 9));
const score = { textContent: 0 };
context.document = {
  querySelector(selector) {
    assert.equal(selector, "#game-score");
    return score;
  },
};
const cells = Array.from({ length: 3 }, (_, index) => ({
  dataset: { apple: String(index) },
  classList: { add() {}, remove() {} },
  setAttribute() {},
  textContent: "",
}));
context.board = {
  querySelectorAll(selector) {
    return selector === "[data-apple]" ? cells : [];
  },
  querySelector() {
    return { hidden: false };
  },
};
vm.runInContext(
  "gameValues=[4,6,9];finishRectangle(board,{indices:[0,1],sum:10})",
  context,
);
assert.equal(score.textContent, 2);
