import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const developmentPlan = readFileSync(new URL("../../../docs/development-plan.md", import.meta.url), "utf8");

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
  assert.doesNotMatch(source, /请确认 API 服务已启动/, "player client source should not expose API startup wording");
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

test("phase 28 client exposes chat shortcut and full-screen chat center", () => {
  for (const copy of [
    "系统",
    "世界",
    "商会",
    "跨服",
    "系统频道只读",
    "内容包含不可发送内容。"
  ]) {
    assert.ok(source.includes(copy), `missing chat copy or guardrail: ${copy}`);
  }

  assert.match(source, /data-testid="home-social-dock"/, "home social dock should stay addressable");
  assert.match(source, /data-testid="home-chat-entry"/, "home chat shortcut should stay addressable");
  assert.match(source, /data-testid="native-chat"/, "full-screen chat page should stay addressable");
  assert.match(source, /data-testid="chat-content-pane"/, "chat content pane should stay addressable");
  assert.match(source, /data-testid="chat-close-button"/, "chat close button should stay addressable without a separate top nav");
  assert.doesNotMatch(source, /\? "可发言" : activeChatChannelConfig\?\.readonlyReason \?\? "系统频道只读"/, "chat status bar should not duplicate send permission copy beside the close button");
  assert.match(source, /data-testid="chat-channel-rail"/, "chat channels should use a left-side category rail");
  assert.match(source, /data-testid="chat-content-pane"/, "chat content should stay in the right-side pane");
  assert.match(source, /data-testid="chat-message-list"/, "chat message list should stay addressable");
  assert.match(source, /data-testid="chat-input-bar"/, "chat input bar should stay addressable");
  assert.match(source, /`chat-channel-\$\{channel\.id\}`/, "each chat channel should stay addressable");
  assert.doesNotMatch(source, /快捷通讯|本地优先词库|发送失败前置校验|已按本地词库替换/, "player chat UI should not expose top-nav, test, or engineering copy");
  assert.match(source, /\/chat\?serverId=/, "client should read chat center from API");
  assert.match(source, /\/chat\/messages/, "client should send chat messages through API");
  assert.doesNotMatch(source, /local chat keyword library/, "player chat UI should not expose backend keyword wording");
});

test("phase 29 client promotes cross-server into an independent full-screen center", () => {
  for (const copy of [
    "跨服创业赛",
    "今日跨服目标",
    "跨服进度",
    "目标完成",
    "今日奖励",
    "今日已领取",
    "报名后领取",
    "声望奖励",
    "下一奖励",
    "下一档",
    "冲榜助力",
    "完成今日目标",
    "参与奖励",
    "阶段奖励",
    "排名奖励",
    "赛季",
    "榜单",
    "创业大赛",
    "跨服商会",
    "战报",
    "赛果回放",
    "赛果回放已生成",
    "赛果摘要",
    "个人对比",
    "商会对比",
    "奖励去向",
    "赛前情报",
    "领取今日奖励",
    "榜首",
    "领先下一名",
    "称号待争夺",
    "榜首商会待定",
    "普通成员贡献计入商会排名",
    "行动力、通行证、VIP 和商会协作",
    "我的排名",
    "前往跨服",
    "暂无跨服数据"
  ]) {
    assert.ok(source.includes(copy), `missing cross-server independent UI copy: ${copy}`);
  }

  assert.match(source, /type NativeHomePage = .*"cross-server"/, "cross-server page should be registered as a native page");
  assert.doesNotMatch(source, /const rightActions = \[[^\]]*"跨服"/, "cross-server should leave the crowded right action rail");
  assert.match(source, /"跨服": "trophy"/, "home cross-server entry should have an icon mapping");
  assert.match(source, /panelName === "跨服"/, "home panel router should handle the cross-server entry");
  assert.match(source, /setNativeHomePage\("cross-server"\)/, "cross-server entry should open the independent page");
  assert.match(source, /data-testid="native-cross-server"/, "independent cross-server page should stay addressable");
  assert.match(source, /data-testid="cross-server-unified-shell"/, "cross-server should render as one unified game panel");
  assert.match(source, /data-testid="cross-server-close-button"/, "cross-server close button should stay addressable without a separate top nav");
  assert.doesNotMatch(source, /data-testid="cross-server-mode-rail"/, "cross-server should not reuse the chat-style left rail");
  assert.match(source, /data-testid="cross-server-stage-bar"/, "cross-server stages should use a horizontal tournament stage bar");
  assert.match(source, /data-testid="cross-server-content-pane"/, "cross-server content should stay addressable");
  assert.match(source, /activeCrossServerMode !== "season"/, "cross-server season overview should be controlled by the stage bar");
  assert.match(source, /activeCrossServerMode !== "board"/, "cross-server board content should be controlled by the stage bar");
  assert.match(source, /activeCrossServerMode !== "guild"/, "cross-server guild content should be controlled by the stage bar");
  assert.match(source, /activeCrossServerMode !== "rewards"/, "cross-server rewards content should be controlled by the stage bar");
  assert.match(source, /activeCrossServerMode !== "history"/, "cross-server history content should be controlled by the stage bar");
  assert.match(source, /data-testid="cross-server-battle-report"/, "cross-server battle report should stay addressable");
  assert.doesNotMatch(source, /business-tabs mt-3/, "cross-server should not keep a second category tab row inside the content pane");
  assert.match(source, /home-cross-server-entry/, "home cross-server entry should stay addressable");
  assert.match(source, /data-testid="cross-server-personal-board"/, "personal cross-server board should stay addressable");
  assert.match(source, /data-testid="cross-server-guild-season"/, "guild cross-server season should stay addressable");
  assert.match(source, /\/cross-server\/daily-reward\/claim/, "cross-server should claim real daily participation rewards");
  assert.match(source, /dailyReward\.canClaim/, "cross-server daily reward button should use server-side claim state");
  assert.match(source, /dailyReward\.actionLabel/, "cross-server daily reward button should show claimed state");
  assert.match(source, /seasonProgress\.completedGoals/, "cross-server season page should use cross-server progress aggregation");
  assert.match(source, /nextReward\.statusLabel/, "cross-server season page should use cross-server next reward aggregation");
  assert.doesNotMatch(source, /Cross 跨服中心/, "cross-server should not keep a separate English top title");
  assert.doesNotMatch(source, /跨服数据读取中，请确认 API 服务已启动。/, "player cross-server empty copy should avoid engineering wording");
  assert.doesNotMatch(source, /不改变跨服结算算法|奖励预览：|长期目标：/, "cross-server player UI should avoid backend-rule or long explanatory copy");
  assert.doesNotMatch(source, /前往跨服查看榜单，结合商会任务、项目协作和长期目标提升估值。/, "cross-server season page should use short player-facing copy");
});

test("phase 30 client exposes mail capsule and full-screen mail center", () => {
  for (const copy of [
    "邮件",
    "全部",
    "未读",
    "已读",
    "系统",
    "奖励",
    "补偿",
    "全部已读",
    "领取附件",
    "待领取",
    "已领取",
    "暂无邮件"
  ]) {
    assert.ok(source.includes(copy), `missing mail center copy: ${copy}`);
  }

  assert.match(source, /type NativeHomePage = .*"mail"/, "mail page should be registered as a native page");
  assert.match(source, /data-testid="home-mail-entry"/, "home mail shortcut should stay addressable");
  assert.match(source, /data-testid="home-mail-unread-count"/, "home unread mail count should stay addressable");
  assert.match(source, /setNativeHomePage\("mail"\)/, "mail capsule should open full-screen mail center");
  assert.match(source, /data-testid="native-mail"/, "full-screen mail page should stay addressable");
  assert.match(source, /data-testid="mail-close-button"/, "mail close button should stay addressable without a separate top nav");
  assert.doesNotMatch(source, /data-testid="mail-channel-rail"/, "mail should not be locked to the chat-style left rail");
  assert.match(source, /data-testid="mail-filter-bar"/, "mail filters should use a compact mailbox filter bar");
  assert.match(source, /data-testid="mail-content-pane"/, "mail content should stay addressable");
  assert.match(source, /data-testid="mail-list"/, "mail list should stay addressable");
  assert.match(source, /data-testid="mail-detail"/, "mail detail should stay addressable");
  assert.match(source, /data-testid="mail-mark-all-read"/, "mark all read button should stay addressable");
  assert.match(source, /data-testid="mail-claim-attachments"/, "mail attachment claim button should stay addressable");
  assert.match(source, /claimStatus: "none" \| "claimable" \| "claimed"/, "mail records should expose attachment claim status");
  assert.doesNotMatch(source, /Mail 邮件中心/, "mail should not keep a separate English top title");
  assert.doesNotMatch(source, /邮件读取中，请确认 API 服务已启动。/, "player mail empty/loading copy should avoid engineering wording");
  assert.match(source, /\/mails\?serverId=/, "client should load mail center from API");
  assert.match(source, /\/mails\/read-all/, "client should mark all mails read through API");
  assert.match(source, /\/mails\/claim-attachments/, "client should claim mail attachments through API");
});

test("phase 28-30 plan requires researched differentiated full-screen layouts", () => {
  assert.match(developmentPlan, /统一安全底座/, "full-screen rules should define a shared safety base rather than one visual template");
  assert.match(developmentPlan, /按功能差异化布局/, "full-screen rules should require function-specific layouts");
  assert.match(developmentPlan, /布局前联网参考/, "full-screen changes should require external layout research before implementation");
  assert.doesNotMatch(developmentPlan, /优先使用“单一统一壳层 \+ 内嵌关闭按钮 \+ 左侧分类轨 \+ 右侧内容区”的结构/, "plan should not force every feature page into the same left-rail layout");
});

test("phase 30 home keeps cross-server chat and mail centered above the main task module", () => {
  assert.match(source, /data-testid="home-social-dock"/, "social dock should be a single centered shortcut row");
  assert.match(source, /left-1\/2 bottom-40/, "social dock should sit centered above the main task module");
  assert.match(source, /data-testid="home-cross-server-entry"/, "cross-server should live in the centered shortcut row");
  assert.match(source, /data-testid="home-chat-entry"/, "chat should live in the centered shortcut row");
  assert.match(source, /data-testid="home-mail-entry"/, "mail should live in the centered shortcut row");
  assert.match(source, /少年三国志式快捷入口/, "layout intent should stay documented in code-native copy");
});
