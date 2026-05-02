import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("phase 27 client preserves pre-launch player main flow coverage", () => {
  for (const text of [
    "玩家登录",
    "恢复登录状态",
    "创建档案",
    "底部导航",
    "财务",
    "员工",
    "业务",
    "市场",
    "商会",
    "跨服创业大赛",
    "活动",
    "排行榜",
    "商业",
    "特权",
    "赛季通行证",
    "背包",
    "专属经理"
  ]) {
    assert.ok(source.includes(text), `missing main flow copy or label: ${text}`);
  }
});

test("phase 27 client keeps full-screen inner pages addressable", () => {
  for (const testId of [
    "native-finance",
    "native-season",
    "native-leaderboard",
    "native-guild",
    "native-shop",
    "native-privilege",
    "native-pass",
    "native-bag"
  ]) {
    assert.match(source, new RegExp(`data-testid="${testId}"`), `${testId} should stay addressable`);
  }
});
