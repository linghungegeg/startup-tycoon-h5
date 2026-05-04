import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

const seedSource = readFileSync(new URL("../../api/prisma/seed.ts", import.meta.url), "utf8");
const repositorySource = readFileSync(new URL("../../api/src/repository.ts", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("phase 47 employee event pool expands to 24 with rotation", () => {
  const employeeEventIds = [...seedSource.matchAll(/id: "random-employee-[^"]+"/g)].map((match) => match[0]);
  assert.ok(employeeEventIds.length >= 24, `expected at least 24 employee random tasks, got ${employeeEventIds.length}`);
  assert.equal(new Set(employeeEventIds).size, employeeEventIds.length, "employee random task ids should be unique");

  for (const id of [
    "random-employee-overtime-run",
    "random-employee-project-rework",
    "random-employee-customer-onsite",
    "random-employee-resignation-warning",
    "random-employee-product-engineering-dispute",
    "random-employee-labor-contract-gap",
    "random-employee-funding-roadshow-support",
    "random-employee-guild-shift"
  ]) {
    assert.match(seedSource, new RegExp(id), `${id} should exist in seed event pool`);
  }

  const employeeBlocks = seedSource.match(/\{\r?\n    id: "random-employee-[\s\S]*?isActive: true\r?\n  \}/g) ?? [];
  assert.ok(employeeBlocks.length >= 24, `expected at least 24 employee blocks, got ${employeeBlocks.length}`);
  for (const block of employeeBlocks) {
    assert.match(block, /category: "employee"/);
    assert.match(block, /optionALabel: "[^"]+"/);
    assert.match(block, /optionBLabel: "[^"]+"/);
    assert.match(block, /optionAResult: "[^"]+"/);
    assert.match(block, /optionBResult: "[^"]+"/);
    assert.match(block, /optionA(ActionPower|Cash|Reputation|CompanyExperience): -?\d+/);
    assert.match(block, /optionB(ActionPower|Cash|Reputation|CompanyExperience): -?\d+/);
    assert.match(block, /riskLabel: "[^"]+"/);
  }

  assert.match(repositorySource, /selectEmployeeRandomTaskConfig/, "repository should select employee tasks by risk signal");
  assert.match(repositorySource, /pressureRisk/, "employee event selection should consider pressure");
  assert.match(repositorySource, /loyaltyRisk/, "employee event selection should consider loyalty");
  assert.match(repositorySource, /onboardingRisk/, "employee event selection should consider onboarding");
  assert.match(repositorySource, /operationRisk/, "employee event selection should consider business support");
  assert.match(appSource, /employeeEventArchiveRows\.slice\(0, 3\)/, "growth tab should keep compact three-row display");
  assert.doesNotMatch(appSource + seedSource + repositorySource, /剧情树|皮肤商店|头像抽取|限定付费池|战力爆发|买了就赢|直接冲榜|羁绊 xxx/);
});
