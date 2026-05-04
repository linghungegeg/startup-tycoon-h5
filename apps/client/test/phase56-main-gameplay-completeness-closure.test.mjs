import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const styleSource = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const repositorySource = readFileSync(new URL("../../api/src/repository.ts", import.meta.url), "utf8");
const auditSource = readFileSync(new URL("../../../docs/product-completeness-audit.md", import.meta.url), "utf8");

test("phase 56 active cash spends show cost and block insufficient cash in the client", () => {
  assert.match(appSource, /EMPLOYEE_CULTIVATE_COST\s*=\s*20_000/, "employee cultivate cost should be explicit in client");
  assert.match(appSource, /selectedProductAdvanceCost/, "product advance cost should be derived for button state");
  assert.match(appSource, /selectedProductRefactorCost/, "product refactor cost should be derived for button state");
  assert.match(appSource, /selectedLoanScheduledRepayCost/, "scheduled loan repayment cost should be derived for button state");
  assert.match(appSource, /selectedLoanFullRepayCost/, "full loan repayment cost should be derived for button state");
  assert.match(appSource, /selectedCompetitorDefendCost/, "market defend cost should be derived for button state");
  assert.match(appSource, /selectedCompetitorCounterCost/, "market counter cost should be derived for button state");
  assert.match(appSource, /现金不足，暂时无法培养员工。/);
  assert.match(appSource, /现金不足，暂时无法推进产品。/);
  assert.match(appSource, /现金不足，暂时无法还款。/);
  assert.match(appSource, /现金不足，暂时无法应对市场行动。/);
});

test("phase 56 competitor response costs are exposed by API records", () => {
  assert.match(repositorySource, /defendCost: number;/);
  assert.match(repositorySource, /counterCost: number;/);
  assert.match(repositorySource, /calculateCompetitorResponseCosts/);
  assert.match(repositorySource, /defendCost: costs\.defendCost/);
  assert.match(repositorySource, /counterCost: costs\.counterCost/);
});

test("phase 56 main gameplay feedback uses floating toasts instead of layout notices", () => {
  assert.match(appSource, /main-gameplay-toast/);
  assert.match(styleSource, /\.main-gameplay-toast/);
  assert.doesNotMatch(appSource, /<p className="employee-error">/);
  assert.doesNotMatch(appSource, /<p className="task-notice">/);
  assert.doesNotMatch(appSource, /<p className="task-error">/);
  assert.doesNotMatch(appSource, /<p className="event-notice">/);
  assert.doesNotMatch(appSource, /<p className="event-error">/);
  assert.doesNotMatch(appSource, /className=\{randomTaskError \? "random-task-error" : "random-task-notice"\}/);
});

test("phase 56 product completeness audit marks the closed main gameplay gaps", () => {
  assert.match(auditSource, /\| 员工团队 \| 已闭环 \|/);
  assert.match(auditSource, /\| 产品研发 \| 已闭环 \|/);
  assert.match(auditSource, /\| 市场竞争 \| 已闭环 \|/);
  assert.match(auditSource, /\| 贷款 \| 已闭环 \|/);
  assert.match(auditSource, /\| 任务 \| 已闭环 \|/);
  assert.match(auditSource, /\| 专属经理事件 \| 已闭环 \|/);
});
