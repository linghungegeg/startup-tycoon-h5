import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const styleSource = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const activitySource = source.slice(
  source.indexOf('{nativeHomePage === "season"'),
  source.indexOf('{nativeHomePage === "leaderboard"')
);
const passSource = source.slice(
  source.indexOf('data-testid="native-pass"'),
  source.indexOf('{nativeHomePage === "vip"')
);
const managerSource = source.slice(
  source.indexOf('{activeNav === "事件"'),
  source.indexOf('{activeRandomTask &&')
);

test("phase 32 activity page uses server-driven progress state", () => {
  assert.doesNotMatch(source, /scoreDelta:\s*260/, "client should not send score deltas for activity progress");
  assert.match(activitySource, /currentSeasonActivity\.canProgress/, "progress button should use server-driven canProgress");
  assert.match(source, /progressLockedReason/, "activity page should show server lock reason");
  assert.match(source, /完成目标|冲榜一次|剧本结算/, "activity buttons should use player-facing action copy");
  assert.match(source, /今日 \$\{currentSeasonActivity\.dailyProgressCount\}\/\$\{currentSeasonActivity\.dailyProgressLimit\}/, "activity page should show daily attempt limits");
});

test("phase 32 activity and pass pages expose the retention commerce loop", () => {
  for (const copy of ["今日活动", "当前积分", "赛季通行证", "活动商店", "荣誉榜单", "赛季商店", "通行证收益"]) {
    assert.match(activitySource, new RegExp(copy), `activity page should expose ${copy}`);
  }
  assert.match(styleSource, /\.activity-native-shell\s*{[^}]*position:\s*absolute;[^}]*inset:\s*0;/s, "activity page should cover the full native viewport");
  assert.match(activitySource, /openHomePanel\("通行证"\)/, "activity page should route pass value to the pass page");
  assert.doesNotMatch(activitySource, /purchaseSeasonPass\(\)/, "activity page should not purchase the pass directly");
  assert.match(activitySource, /当前 \{seasonPoints\} 积分/, "activity shop should show current spendable season points");
  assert.match(activitySource, /还差 \$\{missingPoints\} 分/, "activity shop should explain missing points");
  assert.match(activitySource, /setSelectedActivityShopItemId/, "activity shop should keep the design modal interaction in native state");
  assert.match(activitySource, /道具效果|确认兑换/, "activity shop modal should be translated into Chinese");
  assert.doesNotMatch(activitySource, /Pass Buffs|Current Points|Claim Now|Honor Board|Season Shop|Buff Status|Item Effect|Confirm Exchange|Pts|闭环|增益状态|可查看通行证加成|高速算力加持/, "migrated activity design should not leave English or system-like UI copy");

  for (const copy of ["赛季追赶", "每日赛季随机任务 \\+1", "奖励已入背包", "开通即得", "今日可完成", "待推进", "已完成"]) {
    assert.match(passSource, new RegExp(copy), `pass page should expose ${copy}`);
  }
  for (const copy of ["赛季经验券 x3", "限定称号碎片 x2", "办公室皮肤券 x1"]) {
    assert.match(source, new RegExp(copy), `pass reward copy should include ${copy}`);
  }
  assert.match(passSource, /passImmediateRewards\.map/, "pass page should render immediate reward chips");
  assert.match(passSource, /purchaseSeasonPass\(\)/, "pass page should keep the existing purchase action");
  assert.match(passSource, /progressSeasonTask\(task\.id\)/, "pass page should progress season tasks directly");
  assert.doesNotMatch(passSource, /Pass 通行证|扣 880 平台币送 880 经验|后续奖励线继续承接/, "pass page should not keep hard or unclosed pass copy");
  assert.match(source, /selectedInventoryItem\?\.itemId === "season-exp-ticket"/, "inventory should allow season exp ticket usage");
});

test("phase 32 manager receives activity claim and shop reminders", () => {
  assert.match(source, /claimableSeasonActivities/, "manager attention should include claimable activities");
  assert.match(source, /exchangeableActivityShopItems/, "manager attention should include exchangeable activity shop items");
  assert.match(managerSource, /activityManagerReminders/, "manager list should render activity reminders");
  assert.match(source, /可领奖|可兑换/, "manager activity reminders should use concise player-facing status");
});
