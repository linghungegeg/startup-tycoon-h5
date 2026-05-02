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

test("phase 28 client exposes chat strip and full-screen chat center", () => {
  for (const copy of [
    "聊天横条",
    "系统",
    "世界",
    "商会",
    "跨服",
    "系统频道只读",
    "发送失败"
  ]) {
    assert.ok(source.includes(copy), `missing chat copy or guardrail: ${copy}`);
  }

  assert.match(source, /data-testid="home-chat-strip"/, "home chat strip should stay addressable");
  assert.match(source, /data-testid="native-chat"/, "full-screen chat page should stay addressable");
  assert.match(source, /\/chat\?serverId=/, "client should read chat center from API");
  assert.match(source, /\/chat\/messages/, "client should send chat messages through API");
});

test("phase 29 client promotes cross-server into an independent full-screen center", () => {
  for (const copy of [
    "跨服中心",
    "创业大赛",
    "跨服商会",
    "跨服历史",
    "奖励规则",
    "我的排名",
    "奖励预览",
    "前往跨服",
    "跨服数据读取中，请确认 API 服务已启动。"
  ]) {
    assert.ok(source.includes(copy), `missing cross-server independent UI copy: ${copy}`);
  }

  assert.match(source, /type NativeHomePage = .*"cross-server"/, "cross-server page should be registered as a native page");
  assert.match(source, /const rightActions = \["活动", "排行", "跨服"/, "home should expose a first-level cross-server entry");
  assert.match(source, /"跨服": "trophy"/, "home cross-server entry should have an icon mapping");
  assert.match(source, /panelName === "跨服"/, "home panel router should handle the cross-server entry");
  assert.match(source, /setNativeHomePage\("cross-server"\)/, "cross-server entry should open the independent page");
  assert.match(source, /data-testid="native-cross-server"/, "independent cross-server page should stay addressable");
  assert.match(source, /home-cross-server-entry/, "home cross-server entry should stay addressable");
  assert.match(source, /data-testid="cross-server-personal-board"/, "personal cross-server board should stay addressable");
  assert.match(source, /data-testid="cross-server-guild-season"/, "guild cross-server season should stay addressable");
});
