import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const source = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");

test("phase 27 admin preserves pre-launch main navigation coverage", () => {
  for (const copy of [
    "后台登录",
    "Phase 27 质量收口",
    "数据看板",
    "玩家查询",
    "平台币 / VIP",
    "称号 / 补偿",
    "跨服分组",
    "商会运营",
    "活动运营",
    "经营时钟",
    "经济巡检",
    "配置清单",
    "知识审核",
    "审计日志"
  ]) {
    assert.match(source, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${copy} should stay in admin main flow`);
  }
});

test("phase 27 admin keeps operational sections and guardrail copy visible", () => {
  for (const copy of [
    "商业化数据看板",
    "长期目标点击",
    "玩家账号与公司档案",
    "平台币操作已记录审计",
    "VIP 已调整",
    "跨服分组管理",
    "商会运营列表",
    "活动榜手动结算",
    "活动草案审批",
    "活动发布观察",
    "经营时钟观测",
    "只读观测，不自动修复、不触发玩家侧同步。",
    "经济巡检只读展示风险，不自动修复、不发放奖励、不扣减资产。",
    "付费价值边界",
    "赛季 / 活动运营配置总览",
    "知识审核字段",
    "操作审计日志"
  ]) {
    assert.match(source, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${copy} should stay visible in admin operations`);
  }
});
