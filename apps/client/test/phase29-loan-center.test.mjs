import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const styleSource = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const loanSource = source.slice(
  source.indexOf('{activeNav === "贷款"'),
  source.indexOf('{activeNav === "任务"')
);
const loanToastStyle = styleSource.match(/\.loan-native-toast \{[\s\S]*?\n\}/)?.[0] ?? "";
const loanToastSuccessStyle = styleSource.match(/\.loan-native-toast\.is-success \{[\s\S]*?\n\}/)?.[0] ?? "";
const loanToastErrorStyle = styleSource.match(/\.loan-native-toast\.is-error \{[\s\S]*?\n\}/)?.[0] ?? "";

test("phase 29 loan center ports the native debt management surface", () => {
  for (const copy of [
    "授信与债务管理",
    "当前信用评级",
    "负债率",
    "总负债额度",
    "本期应还",
    "可用授信产品",
    "¥",
    "申请签约拨备",
    "提前结清",
    "下期账单",
    "经营脉冲",
    "确认执行方案"
  ]) {
    assert.ok(loanSource.includes(copy), `missing loan center copy: ${copy}`);
  }

  assert.ok(source.includes("loanCrisisModalRoute"), "loan crisis modal state should be native React state");
  assert.ok(styleSource.includes(".loan-debt-progress"), "loan page should port the debt progress styling");
  assert.ok(styleSource.includes(".loan-native-scroll::-webkit-scrollbar"), "loan page should hide browser scrollbars for H5");
  assert.match(styleSource, /scrollbar-width:\s*none/, "loan page should rely on internal hidden-scroll H5 scrolling");
  assert.match(styleSource, /overscroll-behavior:\s*contain/, "loan page should keep scroll inside the loan panel");
  assert.match(styleSource, /\.loan-native-screen[\s\S]*background:\s*radial-gradient\(circle at top, #1a1e26 0%, #0f1218 100%\)/, "loan page should keep the native opaque dark base");
  assert.match(styleSource, /\.loan-native-actions::before/, "loan actions should restore the native bottom fade without covering content");
  assert.ok(loanSource.indexOf("loan-native-fixed") < loanSource.indexOf("loan-native-scroll"), "loan dashboard should stay fixed above the scrollable product area");
  assert.match(styleSource, /\.loan-native-fixed[\s\S]*flex:\s*0 0 auto/, "loan dashboard should not scroll with product content");
  assert.match(styleSource, /\.loan-native-detail dl div[\s\S]*background:\s*transparent/, "loan detail fields should avoid extra modular inner cards");
  assert.doesNotMatch(loanSource, /推进账期/, "loan page should not expose manual period advancement");
  assert.doesNotMatch(loanSource, /<p className="loan-notice"|<p className="loan-error"/, "loan feedback should not take layout space inside the panel");
  assert.match(loanSource, /loan-native-toast/, "loan feedback should use a floating toast");
  assert.match(loanToastStyle, /position:\s*absolute/, "loan toast should overlay the panel instead of pushing content");
  assert.match(loanToastStyle, /top:\s*42%/, "loan toast should sit near the center of the game panel");
  assert.match(loanToastStyle, /transform:\s*translate\(-50%, -50%\)/, "loan toast should be centered rather than pinned to the top");
  assert.match(loanToastStyle, /width:\s*min\(68%, 280px\)/, "loan toast should be a compact H5 result popup");
  assert.match(loanToastStyle, /border-radius:\s*8px/, "loan toast should use a rectangular game popup shape");
  assert.doesNotMatch(loanToastStyle, /border-radius:\s*999px/, "loan toast should not use the old pill shape");
  assert.match(loanToastSuccessStyle, /background:\s*rgba\(30, 26, 15, 0\.96\)/, "loan success toast should use the loan page gold-black palette");
  assert.match(loanToastErrorStyle, /background:\s*rgba\(44, 18, 18, 0\.96\)/, "loan error toast should use a restrained dark red palette");
  assert.doesNotMatch(loanToastStyle, /top:\s*64px/, "loan toast should not stay fixed under the title bar");
  assert.match(source, /setTimeout\(\(\) => \{\s*setLoanNotice\(""\);\s*setLoanError\(""\);[\s\S]*2200/, "loan success toast should auto dismiss");
  assert.doesNotMatch(loanSource, /Available Credit Products|Debt Management|alert\(|setTimeout/, "loan page should not expose static HTML demo behavior");
  assert.ok(source.includes("提前还本期"), "loan primary action should describe early current-bill repayment");
  assert.ok(source.includes("补缴逾期账单"), "loan primary action should describe overdue repayment");
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
