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
const shopPurchasePopupStyle = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8").match(/\.shop-purchase-popup \{[\s\S]*?\n\}/)?.[0] ?? "";

test("phase 31 right rail keeps leaderboard focused on rankings", () => {
  assert.match(leaderboardSource, /财富巅峰/, "leaderboard page should use the native leaderboard title");
  assert.match(leaderboardSource, /商业精英榜/, "leaderboard page should keep ranking context visible");
  assert.match(leaderboardSource, /primaryLeaderboard/, "leaderboard should render the primary board");
  assert.match(source, /activeActivityBoards/, "leaderboard may render activity boards");
  assert.match(leaderboardSource, /我的排名/, "leaderboard should keep the player rank footer");
  assert.match(source, /type LeaderboardScope = "server" \| "activity" \| "cross"/, "leaderboard should expose server activity and cross scopes");
  assert.match(leaderboardSource, /本服榜/, "leaderboard should expose the server ranking scope");
  assert.match(leaderboardSource, /活动榜/, "leaderboard should expose the activity ranking scope");
  assert.match(leaderboardSource, /跨服榜/, "leaderboard should expose the cross ranking scope");
  assert.match(leaderboardSource, /距上一名/, "leaderboard should show the gap to the previous rank");
  assert.match(leaderboardSource, /榜单奖励将通过邮件发放/, "leaderboard should explain mail-based reward delivery");
  assert.match(leaderboardSource, /leaderboard-footer/, "leaderboard should keep the generated footer structure");

  for (const copy of ["长期目标", "我的荣誉", "跨服摘要", "商会任务", "知识库"]) {
    assert.doesNotMatch(leaderboardSource, new RegExp(copy), `leaderboard should not include ${copy}`);
  }
});

test("phase 31 leaderboard preserves generated native interaction slots", () => {
  for (const copy of [
    "财富巅峰",
    "巅峰席位",
    "资产结构分析",
    "地产资源",
    "科技研发",
    "金融衍生",
    "添加好友",
    "私密会谈",
    "前往商业拜访",
    "TOP-TIER"
  ]) {
    assert.ok(leaderboardSource.includes(copy), `leaderboard native migration should include ${copy}`);
  }

  for (const marker of [
    "selectedLeaderboardPlayer",
    "leaderboardToast",
    "openLeaderboardPlayer",
    "leaderboard-podium",
    "leaderboard-player-modal",
    "leaderboard-asset-fill"
  ]) {
    assert.ok(source.includes(marker), `leaderboard native migration should preserve ${marker}`);
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
  assert.match(source, /const rightActions = \["活动", "排行", "商城", "特权", "通行证", "专属经理"\]/, "right rail should expose shop as 商城");
  assert.doesNotMatch(shopSource, /商业入口导航|去特权|去通行证|去背包/, "shop should not explain other entrances");
  assert.doesNotMatch(privilegeSource, /特权入口导航|去商城|去通行证|去背包/, "privilege should not explain other entrances");
  assert.doesNotMatch(passSource, /通行证入口导航|去商城|去特权|去背包/, "pass should not explain other entrances");
  assert.match(shopSource, /shop-purchase-popup/, "shop purchase feedback should render as an overlay popup");
  assert.match(privilegeSource, /shop-purchase-popup/, "privilege purchase feedback should render as an overlay popup");
  assert.match(shopPurchasePopupStyle, /position:\s*absolute/, "purchase popup should overlay the current native page");
  assert.match(shopPurchasePopupStyle, /top:\s*42%/, "purchase popup should match the left-side native action toast position");
  assert.match(shopPurchasePopupStyle, /left:\s*50%/, "purchase popup should be horizontally centered");
  assert.match(shopPurchasePopupStyle, /border-left-width:\s*4px/, "purchase popup should match the left-side native action toast shape");
  assert.match(source, /setShopNotice\(""\);\s*setShopError\(""\);[\s\S]*shopError \? 3200 : 2200/, "shop purchase popup should auto dismiss like left-side action toasts");
});

test("phase 31 right rail red dots are state driven", () => {
  assert.match(source, /const shouldShowRightActionRedDot = \(item: string\): boolean =>/, "right rail should use state-driven red dots");
  assert.match(source, /hasLeaderboardAttention/, "right rail should include ranking attention state");
  assert.match(source, /item === "排行"/, "rank entry should have state-driven red dot logic");
  assert.match(rightRailSource, /shouldShowRightActionRedDot\(item\)/, "right rail should render red dots from state");
  assert.doesNotMatch(rightRailSource, /\[0, 3, 4\]\.includes\(index\)/, "right rail should not hard-code red dot positions");
});
