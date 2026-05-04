import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const httpSource = readFileSync(new URL("../../../apps/api/src/http.ts", import.meta.url), "utf8");

const playerActionEnglishCopies = [
  "No project is available.",
  "Project has already been settled.",
  "Project is not ready to settle.",
  "No employee candidates are available.",
  "Required recruit item is not available.",
  "No employee candidates are available for this role.",
  "Founder equity is not enough.",
  "Cash is not enough for employee training.",
  "Required employee item is not available.",
  "This product line is already active.",
  "Cash is not enough for this product action.",
  "Product line has already been closed.",
  "Competitor action not found.",
  "Competitor action has already been resolved.",
  "Cash is not enough for this market response.",
  "Financing terms are not available.",
  "This financing negotiation is already active.",
  "Financing record has already been settled.",
  "Follow-on investment is not available.",
  "Financing terms are blocked or disbursement is paused.",
  "Credit rating is not enough for this loan.",
  "This loan is already active.",
  "Loan product conditions are not met.",
  "Cash is not enough to repay this loan.",
  "No active loan is available."
];

test("phase 52 player actions do not expose backend English closure errors", () => {
  for (const copy of playerActionEnglishCopies) {
    assert.doesNotMatch(httpSource, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${copy} should be localized`);
  }

  assert.match(appSource, /const playerActionErrorMessages/, "client should keep a Chinese fallback map for stale action errors");
  assert.match(appSource, /NO_PROJECT_AVAILABLE: "暂无可接项目。"/);
  assert.match(appSource, /PRODUCT_ALREADY_ACTIVE: "该产品线已立项。"/);
  assert.match(appSource, /FUNDING_LOCKED: "当前融资条件暂不可谈。"/);
  assert.match(appSource, /LOAN_LOCKED: "贷款条件暂未满足。"/);
  assert.match(appSource, /formatPlayerActionError/);
});
