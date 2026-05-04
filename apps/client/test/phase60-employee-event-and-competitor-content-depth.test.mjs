import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

const seedSource = readFileSync(new URL("../../api/prisma/seed.ts", import.meta.url), "utf8");
const repositorySource = readFileSync(new URL("../../api/src/repository.ts", import.meta.url), "utf8");
const auditSource = readFileSync(new URL("../../../docs/product-completeness-audit.md", import.meta.url), "utf8");

const sliceConstArray = (source, name) => {
  const start = source.indexOf(`const ${name} = [`);
  assert.notEqual(start, -1, `missing ${name}`);
  const nextConst = source.indexOf("\nconst ", start + 1);
  return source.slice(start, nextConst === -1 ? source.length : nextConst);
};

const countEntries = (block) => (block.match(/\n\s*id: "/g) ?? []).length;

test("phase 60 employee event pool reaches long-term coverage", () => {
  const employeeBlocks = seedSource.match(/\{\r?\n    id: "random-employee-[\s\S]*?isActive: true\r?\n  \}/g) ?? [];
  const employeeEventIds = employeeBlocks.map((block) => block.match(/id: "([^"]+)"/)?.[1]).filter(Boolean);

  assert.ok(employeeBlocks.length >= 36, `expected at least 36 employee events, got ${employeeBlocks.length}`);
  assert.equal(new Set(employeeEventIds).size, employeeEventIds.length, "employee event ids should stay unique");

  for (const copy of ["产品", "市场", "财务", "人事", "运营", "客服", "法务", "压力", "忠诚", "新人", "岗位", "商会"]) {
    assert.ok(seedSource.includes(copy), `employee events should cover ${copy}`);
  }

  for (const id of [
    "random-employee-finance-reconcile",
    "random-employee-customer-complaint",
    "random-employee-legal-review",
    "random-employee-ops-runbook",
    "random-employee-product-quality-review",
    "random-employee-market-campaign-review"
  ]) {
    assert.match(seedSource, new RegExp(id), `${id} should exist in employee event pool`);
  }

  assert.match(repositorySource, /employeePressureTaskIds[\s\S]*random-employee-ops-runbook/);
  assert.match(repositorySource, /employeeLoyaltyTaskIds[\s\S]*random-employee-customer-complaint/);
  assert.match(repositorySource, /employeeOnboardingTaskIds[\s\S]*random-employee-hr-probation-check/);
  assert.match(repositorySource, /employeeOperationTaskIds[\s\S]*random-employee-finance-reconcile/);
});

test("phase 60 competitor action pool reaches long-term market pressure coverage", () => {
  const competitorActionConfigs = sliceConstArray(seedSource, "competitorActionConfigs");
  const trackIds = [...competitorActionConfigs.matchAll(/trackId: "([^"]+)"/g)].map((match) => match[1]);
  const enterpriseCount = trackIds.filter((trackId) => trackId === "enterprise-saas").length;
  const aiToolsCount = trackIds.filter((trackId) => trackId === "ai-tools").length;

  assert.ok(countEntries(competitorActionConfigs) >= 20, "market competition should have at least 20 competitor actions");
  assert.ok(enterpriseCount >= 10, `enterprise SaaS should have at least 10 actions, got ${enterpriseCount}`);
  assert.ok(aiToolsCount >= 10, `AI tools should have at least 10 actions, got ${aiToolsCount}`);

  for (const copy of ["价格战", "专利", "挖角", "渠道", "客户迁移", "融资", "政策", "口碑", "交付", "数据安全"]) {
    assert.ok(competitorActionConfigs.includes(copy), `competitor actions should cover ${copy}`);
  }

  for (const field of [
    "cashImpact",
    "monthlyIncomeImpact",
    "monthlyExpenseImpact",
    "marketShareDeltaBasisPoints",
    "competitorShareDeltaBasisPoints",
    "responseCost",
    "responseShareDeltaBasisPoints"
  ]) {
    assert.match(competitorActionConfigs, new RegExp(`${field}: -?\\d+`), `${field} should stay populated`);
  }
});

test("phase 60 audit records employee event and competitor content completion", () => {
  assert.match(auditSource, /\| 员工事件 \| 已闭环 \|/);
  assert.match(auditSource, /\| 市场竞争 \| 已闭环 \|/);
  assert.match(auditSource, /员工事件.*36/);
  assert.match(auditSource, /竞品行动.*20/);
});
