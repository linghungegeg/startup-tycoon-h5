import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

const profileSource = source.slice(
  source.indexOf('data-testid="native-profile-center"'),
  source.indexOf('{nativeHomePage === "chat"')
);
const leaderboardSource = source.slice(
  source.indexOf('data-testid="native-leaderboard"'),
  source.indexOf('{nativeHomePage === "cross-server"')
);
const managerSource = source.slice(
  source.indexOf('{activeNav === "事件"'),
  source.indexOf('{activeRandomTask &&')
);
const shopSource = source.slice(
  source.indexOf('data-testid="native-shop"'),
  source.indexOf('{nativeHomePage === "privilege"')
);
const privilegeSource = source.slice(
  source.indexOf('data-testid="native-privilege"'),
  source.indexOf('{nativeHomePage === "pass"')
);
const passSource = source.slice(
  source.indexOf('data-testid="native-pass"'),
  source.indexOf('{nativeHomePage === "vip"')
);
const rightRailSource = source.slice(
  source.indexOf("{rightActions.map"),
  source.indexOf('<div aria-label="少年三国志式快捷入口"')
);

test("phase 31 right rail keeps leaderboard focused on rankings", () => {
  assert.match(leaderboardSource, />排行榜</, "leaderboard page should use a ranking title");
  assert.match(leaderboardSource, /primaryLeaderboard/, "leaderboard should render the primary board");
  assert.match(leaderboardSource, /activityBoards/, "leaderboard may render activity boards");
  assert.match(leaderboardSource, /我的排名/, "leaderboard should keep the player rank footer");

  for (const copy of ["长期目标", "我的荣誉", "跨服摘要", "商会任务", "知识库"]) {
    assert.doesNotMatch(leaderboardSource, new RegExp(copy), `leaderboard should not include ${copy}`);
  }
});

test("phase 31 profile center owns honor and collection summaries", () => {
  for (const copy of ["我的荣誉", "当前称号", "已获得称号", "成就进度", "赛季荣誉", "活动回顾", "商会历史", "跨服历史", "知识卡"]) {
    assert.ok(profileSource.includes(copy), `profile center should include ${copy}`);
  }

  assert.doesNotMatch(profileSource, /VIP经验|每日礼包|claimVipDailyGift/, "profile center should not pull VIP center content back in");
});

test("phase 31 manager owns long-term goals", () => {
  assert.match(source, /useState<"events" \| "random" \| "goals">/, "manager tab state should include goals");
  assert.match(managerSource, />成长目标</, "manager should expose the growth goals tab");
  assert.match(managerSource, /longTermGoals\.sections\.map/, "manager should render long-term goal sections");
  assert.match(managerSource, /今天做什么，本周追什么，赛季争什么，长期收集什么/, "manager should own the long-term goal summary");
});

test("phase 31 commerce privilege and pass drop entrance navigation copy", () => {
  assert.doesNotMatch(shopSource, /商业入口导航|去特权|去通行证|去背包/, "shop should not explain other entrances");
  assert.doesNotMatch(privilegeSource, /特权入口导航|去商业|去通行证|去背包/, "privilege should not explain other entrances");
  assert.doesNotMatch(passSource, /通行证入口导航|去商业|去特权|去背包/, "pass should not explain other entrances");
});

test("phase 31 right rail red dots are state driven", () => {
  assert.match(source, /const shouldShowRightActionRedDot = \(item: string\): boolean =>/, "right rail should use state-driven red dots");
  assert.match(rightRailSource, /shouldShowRightActionRedDot\(item\)/, "right rail should render red dots from state");
  assert.doesNotMatch(rightRailSource, /\[0, 3, 4\]\.includes\(index\)/, "right rail should not hard-code red dot positions");
});
