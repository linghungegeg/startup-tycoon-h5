import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const activitySource = source.slice(
  source.indexOf('{nativeHomePage === "season"'),
  source.indexOf('{nativeHomePage === "leaderboard"')
);
const managerSource = source.slice(
  source.indexOf('{activeNav === "事件"'),
  source.indexOf('{activeRandomTask &&')
);

test("phase 32 activity page uses server-driven progress state", () => {
  assert.doesNotMatch(source, /scoreDelta:\s*260/, "client should not send score deltas for activity progress");
  assert.match(activitySource, /activity\.canProgress/, "progress button should use server-driven canProgress");
  assert.match(activitySource, /activity\.progressLockedReason/, "activity page should show server lock reason");
  assert.match(activitySource, /完成目标|冲榜一次|剧本结算/, "activity buttons should use player-facing action copy");
  assert.match(activitySource, /今日 \$\{activity\.dailyProgressCount\}\/\$\{activity\.dailyProgressLimit\}/, "activity page should show daily attempt limits");
});

test("phase 32 manager receives activity claim and shop reminders", () => {
  assert.match(source, /claimableSeasonActivities/, "manager attention should include claimable activities");
  assert.match(source, /exchangeableActivityShopItems/, "manager attention should include exchangeable activity shop items");
  assert.match(managerSource, /activityManagerReminders/, "manager list should render activity reminders");
  assert.match(source, /可领奖|可兑换/, "manager activity reminders should use concise player-facing status");
});
