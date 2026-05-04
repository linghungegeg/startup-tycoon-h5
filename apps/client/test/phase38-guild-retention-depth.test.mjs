import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("phase 38 guild page explains daily retention loop without backend wording", () => {
  assert.match(appSource, /今日商会目标/);
  assert.match(appSource, /今日可做/);
  assert.match(appSource, /可领取/);
  assert.match(appSource, /跨服商会赛季/);
  assert.match(appSource, /recommendedAction/);
  assert.match(appSource, /today-guild-guidance/);
  assert.doesNotMatch(appSource, /Guild 商会/);
});
