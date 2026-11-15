const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const context = vm.createContext({});
vm.runInContext(
  fs.readFileSync(__dirname + "/../frontend/apple-selection.js", "utf8"),
  context,
);
const select = context.selectAppleRectangle;
const cells = Array.from({ length: 9 }, (_, index) => ({
  index,
  x: (index % 3) * 50 + 25,
  y: Math.floor(index / 3) * 50 + 25,
}));
const values = [1, 2, 9, 3, 4, 8, 7, 6, 5];
const forward = select(cells, { x: 0, y: 0 }, { x: 100, y: 100 }, values);
assert.deepEqual(Array.from(forward.indices), [0, 1, 3, 4]);
assert.equal(forward.sum, 10); // Every interior apple counts, not just the two corners.
const backward = select(cells, { x: 100, y: 100 }, { x: 0, y: 0 }, values);
assert.equal(JSON.stringify(backward), JSON.stringify(forward));
assert.equal(select(cells, { x: 0, y: 0 }, { x: 150, y: 150 }, values).sum, 45);
assert.deepEqual(
  Array.from(
    select(
      cells,
      { x: 0, y: 0 },
      { x: 100, y: 100 },
      [0, 2, 9, 3, 4, 8, 7, 6, 5],
    ).indices,
  ),
  [1, 3, 4],
);
assert.equal(select(cells, { x: -10, y: -10 }, { x: 0, y: 0 }, values).sum, 0);
assert.equal(select(cells, { x: 25, y: 25 }, { x: 75, y: 75 }, values).sum, 10);
console.log(
  "Rectangle selection: interior, reverse drag, non-10 sum, cleared cells, empty area and boundaries passed.",
);
