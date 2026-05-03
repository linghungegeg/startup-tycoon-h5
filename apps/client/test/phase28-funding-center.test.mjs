import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const fundingSource = source.slice(
  source.indexOf('{activeNav === "融资"'),
  source.indexOf('{activeNav === "贷款"')
);

test("phase 28 funding center keeps player-facing gate and post-investment copy", () => {
  for (const copy of [
    "融资路演",
    "融资方案列表",
    "当前状态",
    "公司估值",
    "账上现金",
    "门槛",
    "投后管理事件",
    "最近谈判结果",
    "无需法务",
    "法务复核",
    "暂停打款",
    "加投",
    "敲定后显示投后反馈。"
  ]) {
    assert.ok(fundingSource.includes(copy), `missing funding center copy: ${copy}`);
  }
  assert.ok(source.includes("等待打款"), "funding status copy should translate scheduled disbursement");

  assert.doesNotMatch(fundingSource, /请确认 API 服务已启动|backend|debug|TODO/, "funding UI should not expose engineering copy");
  assert.doesNotMatch(fundingSource, /路演名单|条款卷宗|融资概览|投资人列表|融资详情|法务复核 not_required|打款 scheduled/, "funding UI should use the native financing roadshow layout and status copy");
  assert.match(source, /lockedReason|gateStatus/, "funding offers should render server-side gate state");
  assert.match(source, /postInvestmentEvents|投后管理事件/, "funding center should expose post-investment event state");
});

test("phase 28 funding center uses planned funding API paths", () => {
  for (const apiPath of [
    "/finance/fundings?serverId=",
    "/finance/fundings/start",
    "/settle",
    "/legal-review",
    "/pause-disbursement",
    "/follow-on"
  ]) {
    assert.ok(source.includes(apiPath), `missing funding API path: ${apiPath}`);
  }

  assert.match(source, /runFundingAction\(`\/finance\/fundings\/\$\{encodeURIComponent\([^)]*\.id\)\}\/legal-review`/, "legal review should call the funding action helper");
  assert.match(source, /runFundingAction\(`\/finance\/fundings\/\$\{encodeURIComponent\([^)]*\.id\)\}\/pause-disbursement`/, "pause disbursement should call the funding action helper");
  assert.match(source, /runFundingAction\(`\/finance\/fundings\/\$\{encodeURIComponent\([^)]*\.id\)\}\/follow-on`/, "follow-on investment should call the funding action helper");
});
