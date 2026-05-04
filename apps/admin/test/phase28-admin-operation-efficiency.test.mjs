import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const source = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
const styleSource = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

test("phase 28 admin replaces browser confirms with an in-app confirmation modal", () => {
  assert.doesNotMatch(source, /window\.confirm/, "admin should not use browser-native confirm dialogs");
  assert.match(source, /admin-confirm-modal/, "admin should render an in-app confirm modal");
  assert.match(styleSource, /\.admin-confirm-modal/, "admin confirm modal should have dedicated styling");
  assert.match(source, /pendingAdminAction/, "admin should store pending high-risk actions in React state");

  for (const copy of ["动作名称", "影响范围", "审计原因", "风险级别", "确认执行"]) {
    assert.match(source, new RegExp(copy), `${copy} should be visible in the confirm modal`);
  }
});

test("phase 28 admin exposes settlement automation without unattended rewards", () => {
  for (const copy of [
    "/admin/settlement-candidates",
    "/admin/cross-server/rules",
    "/admin/cross-server/settlement-runs",
    "待结算队列",
    "批量结算",
    "规则配置",
    "自动结算记录",
    "每日22:00",
    "每周六20:00",
    "异常补结算",
    "跨服经营战榜",
    "跨服个人榜",
    "当前对阵预览",
    "主服",
    "批量结算结果",
    "幂等重试"
  ]) {
    assert.match(source, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${copy} should be wired into admin settlement workspace`);
  }
  assert.match(source, /crossLeaderboard/, "settlement candidates should distinguish cross-server personal leaderboard rows");
  assert.match(source, /crossServerRuleConfig/, "admin should store cross-server rule config state");
  assert.match(source, /crossServerSettlementRuns/, "admin should store automatic settlement run rows");
  assert.match(source, /selectedSettlementCandidateIds/, "settlement candidates should support explicit selection");
  assert.match(source, /runSelectedSettlementCandidates/, "batch settlement should run through a dedicated action");
});

test("phase 28 admin report density adds compact summaries and audit chips", () => {
  for (const copy of [
    "运营速览",
    "风险摘要",
    "严重",
    "待结算",
    "奖励边界",
    "审计快筛",
    "结算",
    "资产",
    "封禁",
    "补偿",
    "配置",
    "知识",
    "聊天"
  ]) {
    assert.match(source, new RegExp(copy), `${copy} should be present for denser admin reporting`);
  }
  assert.match(styleSource, /\.dense-kpi-strip/, "dense KPI strip should be styled");
  assert.match(styleSource, /\.audit-chip-row/, "audit quick filter chips should be styled");
});

test("phase 28 admin high-risk button copy is shorter and cleaner", () => {
  assert.doesNotMatch(source, /二次确认后/, "high-risk buttons should no longer expose process wording");
  for (const copy of ["提交调整", "结算奖励", "发送补偿", "保存知识卡", "安全发布"]) {
    assert.match(source, new RegExp(copy), `${copy} should be used as concise action copy`);
  }
});
