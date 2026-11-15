const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(__dirname + "/../frontend/settings.js", "utf8");

function openSettings(storage) {
  const root = { dataset: {} };
  const meta = {};
  const context = vm.createContext({
    localStorage: storage,
    document: { documentElement: root, querySelector: () => meta },
  });
  vm.runInContext(source, context);
  return { context, root, meta };
}

const saved = new Map();
const storage = {
  getItem: (key) => saved.get(key) ?? null,
  setItem: (key, value) => saved.set(key, value),
};
const first = openSettings(storage);
assert.equal(first.root.dataset.theme, "light");
vm.runInContext(
  "preferences.darkMode = true; preferences.showBackground = false; preferences.reduceMotion = true; saveSettings()",
  first.context,
);
assert.equal(first.root.dataset.theme, "dark");
assert.equal(first.meta.content, "#17201b");
const reopened = openSettings(storage);
assert.equal(reopened.root.dataset.theme, "dark");
assert.equal(reopened.root.dataset.background, "false");
assert.equal(reopened.root.dataset.reducedMotion, "true");

saved.set("youwith.preferences", "{corrupt");
assert.equal(openSettings(storage).root.dataset.theme, "light");
saved.set(
  "youwith.preferences",
  JSON.stringify({
    darkMode: "false",
    showBackground: false,
    reduceMotion: 1,
    unexpected: true,
  }),
);
const invalid = openSettings(storage);
assert.equal(invalid.root.dataset.theme, "light");
assert.equal(invalid.root.dataset.background, "false");
assert.equal(invalid.root.dataset.reducedMotion, "false");
assert.equal(
  vm.runInContext("Object.keys(preferences).length", invalid.context),
  3,
);

const unavailable = openSettings({
  getItem() {
    throw Error("Storage unavailable");
  },
  setItem() {
    throw Error("Storage unavailable");
  },
});
assert.equal(unavailable.root.dataset.theme, "light");
assert.equal(
  vm.runInContext(
    "preferences.darkMode = true; saveSettings()",
    unavailable.context,
  ),
  false,
);
assert.equal(unavailable.root.dataset.theme, "dark"); // Still applies when saving is blocked.
console.log(
  "Settings persistence, invalid data, storage failure and reload passed.",
);
