import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const styleSource = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const loanSource = source.slice(
  source.indexOf('{activeNav === "贷款"'),
  source.indexOf('{activeNav === "任务"')
);

test("phase 29 loan center ports the native debt management surface", () => {
  for (const copy of [
    "授信与债务管理",
    "当前信用评级",
    "负债率",
    "总负债额度",
    "本期应还",
    "可用授信产品",
    "申请签约拨备",
    "偿还本期账单",
    "提前结清",
    "推进账期",
    "确认执行方案"
  ]) {
    assert.ok(loanSource.includes(copy), `missing loan center copy: ${copy}`);
  }

  assert.ok(source.includes("loanCrisisModalRoute"), "loan crisis modal state should be native React state");
  assert.ok(styleSource.includes(".loan-debt-progress"), "loan page should port the debt progress styling");
  assert.ok(styleSource.includes(".loan-native-scroll::-webkit-scrollbar"), "loan page should hide browser scrollbars for H5");
  assert.match(styleSource, /scrollbar-width:\s*none/, "loan page should rely on internal hidden-scroll H5 scrolling");
  assert.match(styleSource, /overscroll-behavior:\s*contain/, "loan page should keep scroll inside the loan panel");
  assert.doesNotMatch(loanSource, /Available Credit Products|Debt Management|alert\(|setTimeout/, "loan page should not expose static HTML demo behavior");
});

test("phase 29 loan center includes full-stage loan product states", () => {
  for (const copy of [
    "高风险",
    "信用不足",
    "月供压力高",
    "逾期会降信用",
    "需要已有贷款",
    "尚未进入危机场景"
  ]) {
    assert.ok(source.includes(copy), `missing loan state copy: ${copy}`);
  }

  assert.match(source, /isHighRisk/, "loan offers should expose high-risk state");
  assert.match(source, /purposeTag/, "loan offers should expose usage tags");
  assert.match(source, /applicationImpact/, "loan offers should expose application impact copy");
});
