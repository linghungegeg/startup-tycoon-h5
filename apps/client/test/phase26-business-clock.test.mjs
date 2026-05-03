import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";

test("phase 26 finance page exposes business clock pulse summary copy", async () => {
  const source = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");

  for (const copy of [
    "BusinessClockPulse",
    "经营时钟",
    "经营流水",
    "经营暂无新增变化",
    "夜间经营简报",
    "建议动作",
    "行动力恢复",
    "离线时长"
  ]) {
    assert.match(source, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${copy} should be rendered or typed`);
  }

  for (const copy of [
    "现金流总览",
    "财务顾问提示",
    "财务账本"
  ]) {
    assert.match(source, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `finance page should expose compact player-facing section: ${copy}`);
  }

  assert.doesNotMatch(source, /aria-label="经营指标"/, "finance page should not split secondary metrics into a separate modular card section");
  assert.doesNotMatch(source, /生成第 \{companyFinance\.financeMonth\} 月经营报告/, "finance page should not expose a manual month-settlement button to players");
  assert.doesNotMatch(source, /settleFinanceMonth/, "finance page should not keep a client-side manual month-settlement action");

  for (const copy of [
    "经营时钟使用服务器时间懒同步",
    "经营时钟冷却中",
    "平台币 / VIP / 榜单不变"
  ]) {
    assert.doesNotMatch(source, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `finance page should not expose backend wording: ${copy}`);
  }
});
