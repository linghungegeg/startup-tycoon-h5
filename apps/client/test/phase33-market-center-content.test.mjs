import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const seedSource = readFileSync(new URL("../../../apps/api/prisma/seed.ts", import.meta.url), "utf8");

const sliceConstArray = (source, name) => {
  const start = source.indexOf(`const ${name} = [`);
  assert.notEqual(start, -1, `missing ${name}`);
  const nextConst = source.indexOf("\nconst ", start + 1);
  return source.slice(start, nextConst === -1 ? source.length : nextConst);
};

const countEntries = (block) => (block.match(/\n\s*id: "/g) ?? []).length;

test("phase 33 market center has enough content for repeat visits", () => {
  const projectConfigs = sliceConstArray(seedSource, "projectConfigs");
  const productConfigs = sliceConstArray(seedSource, "productConfigs");
  const competitorActionConfigs = sliceConstArray(seedSource, "competitorActionConfigs");

  assert.ok(countEntries(projectConfigs) >= 8, "project delivery should have at least 8 seed projects");
  assert.ok(countEntries(productConfigs) >= 5, "product development should have at least 5 seed products");
  assert.ok(countEntries(competitorActionConfigs) >= 8, "market competition should have at least 8 competitor actions");

  for (const copy of ["政企标案", "会员运营", "数据看板", "私域增长", "渠道封锁", "客户迁移", "融资压制", "政策波动"]) {
    assert.ok(seedSource.includes(copy), `market center content should cover ${copy}`);
  }

  for (const taskId of ["daily-product-advance", "daily-market-response"]) {
    assert.ok(seedSource.includes(`id: "${taskId}"`), `${taskId} should support 3-7 day market center retention`);
  }
});

test("phase 33 market center keeps old business copy out of player UI", () => {
  assert.doesNotMatch(appSource, /继续推进业务/, "manager empty state should not route players back to business wording");
  assert.doesNotMatch(appSource, /"业务": "layout-dashboard"/, "removed business nav should not keep an icon mapping");
  assert.match(appSource, /先触发竞品行动/, "market competition should explain defend and counter prerequisites");
});
