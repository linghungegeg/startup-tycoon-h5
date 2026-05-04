import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const seedSource = readFileSync(new URL("../../api/prisma/seed.ts", import.meta.url), "utf8");

test("phase 46 employee event results return to growth page", () => {
  assert.match(appSource, /employeeRandomTaskRows/, "growth tab should include handled employee event rows");
  assert.match(appSource, /resultSummary/, "handled employee events should show the latest result summary");
  assert.match(appSource, /已处理/, "employee event rows should expose resolved state");
  assert.match(appSource, /已保留/, "employee event rows should expose dismissed state");
  assert.match(appSource, /待处理/, "employee event rows should expose pending state");
  assert.match(appSource, /formatEmployeeEventState/, "employee detail should clean event state copy");
  assert.match(appSource, /openEmployeeEventManager/, "pending employee events should still route to manager handling");

  const employeeEventIds = [...seedSource.matchAll(/id: "random-employee-[^"]+"/g)].map((match) => match[0]);
  assert.ok(employeeEventIds.length >= 3, `expected at least 3 employee random tasks, got ${employeeEventIds.length}`);
  assert.match(seedSource, /random-employee-salary-talk/);
  assert.match(seedSource, /random-employee-poaching/);
  assert.match(seedSource, /random-employee-onboarding/);
  assert.doesNotMatch(appSource + seedSource, /剧情树|皮肤商店|头像抽取|限定付费池|战力爆发|买了就赢|直接冲榜|羁绊 xxx/);
});
