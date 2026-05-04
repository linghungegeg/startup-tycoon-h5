import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const repositorySource = readFileSync(new URL("../../api/src/repository.ts", import.meta.url), "utf8");

test("phase 43 employee collection goals show lightweight rewards and states", () => {
  assert.match(appSource, /type EmployeeCollectionGoal/, "client should type collection goal records from the API");
  assert.match(appSource, /rewardLabel/, "collection goals should expose a lightweight reward label");
  assert.match(appSource, /status: "继续补齐" \| "可领取" \| "已领取"/, "collection goals should expose clear player-facing states");
  assert.match(appSource, /goal\.rewardLabel/, "codex goal rows should render reward labels");
  assert.match(appSource, /goal\.status/, "codex goal rows should render collection goal state");
  assert.match(repositorySource, /领取员工收集奖励/, "manager guidance should prioritize claimable collection rewards");
  assert.doesNotMatch(appSource, /皮肤商店|战力爆发|买了就赢|直接冲榜|羁绊 xxx/, "collection reward copy should avoid overpromising or technical wording");
});
