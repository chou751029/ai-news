import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const repoRoot = process.cwd();
const periods = fs
  .readdirSync(path.join(repoRoot, "periods"))
  .filter((name) => name.endsWith(".json"))
  .map((name) => JSON.parse(fs.readFileSync(path.join(repoRoot, "periods", name), "utf8")));
const articleCount = periods.reduce(
  (total, period) => total + period.domestic.length + period.international.length,
  0,
);

assert.equal(periods.length, 11, "expected all 11 historical and upcoming periods");
assert.equal(articleCount, 173, "historical article count changed unexpectedly");

const current = periods.find((period) => period.id === "p_0716");
assert.ok(current, "missing p_0716");
assert.equal(current.label, "07/16 - 07/30");
assert.equal(current.domestic.length, 12);
assert.equal(current.international.length, 15);
assert.equal(Object.keys(current.origTitles).length, 12);
assert.equal(
  current.origTitles[current.international[0].url],
  "Nvidia unveils new AI model and expands Japan’s physical AI ecosystem",
);
assert.notEqual(current.international[0].title, current.origTitles[current.international[0].url]);

const upcoming = periods.find((period) => period.id === "p_0731");
assert.ok(upcoming, "missing p_0731");
assert.equal(upcoming.label, "07/31 - 08/15");
assert.equal(upcoming.domestic.length + upcoming.international.length, 0);

const html = fs.readFileSync(path.join(repoRoot, "index.html"), "utf8");
const scriptMatch = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/);
assert.ok(scriptMatch, "component script not found");
const componentScript = scriptMatch[1].replace(
  "class Component extends DCLogic",
  "globalThis.Component = class Component extends DCLogic",
);

function componentAt(isoDate) {
  const RealDate = Date;
  class FixedDate extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : [isoDate]));
    }
  }
  const context = {
    Date: FixedDate,
    Intl,
    DCLogic: class {},
  };
  vm.createContext(context);
  vm.runInContext(componentScript, context);
  return new context.Component({});
}

const currentComponent = componentAt("2026-07-27T04:00:00Z");
assert.equal(currentComponent.state.periodId, "p_0716");
assert.equal(componentAt("2026-08-01T04:00:00Z").state.periodId, "p_0731");

function assertNewestFirst(items) {
  const keys = items.map((item) => {
    const [month, day] = item.date.split("/").map(Number);
    return item.periodYear * 10000 + month * 100 + day;
  });
  assert.deepEqual(keys, keys.slice().sort((a, b) => b - a));
}

assertNewestFirst(currentComponent.scopedItems());
currentComponent.state.region = "international";
assertNewestFirst(currentComponent.scopedItems());
currentComponent.state.view = "database";
assertNewestFirst(currentComponent.scopedItems());

console.log(`Validated ${periods.length} periods and ${articleCount} articles`);
