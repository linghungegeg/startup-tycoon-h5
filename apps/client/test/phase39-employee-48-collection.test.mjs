import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const seedSource = readFileSync(new URL("../../api/prisma/seed.ts", import.meta.url), "utf8");

const employeeBlock = seedSource.slice(
  seedSource.indexOf("const employeeConfigs = ["),
  seedSource.indexOf("const projectConfigs = [")
);

test("phase 39 employee pool expands to 48 and keeps collection goals lightweight", () => {
  const employeeIds = [...employeeBlock.matchAll(/id: "[a-z]+-[a-z]+"/g)].map((match) => match[0]);
  assert.equal(employeeIds.length, 48);

  for (const role of ["投资关系", "财务", "法务", "市场", "公关", "客服", "顾问", "高管", "产品经理"]) {
    assert.match(employeeBlock, new RegExp(`role: "${role}"`), `employee pool should include ${role}`);
  }

  assert.match(appSource, /已招募 \{employeeCollection\?\.owned \?\? 0\}\/\{employeeCollection\?\.total \?\? 48\}/);
  assert.match(appSource, /收集目标/);
  assert.match(appSource, /资本团队/);
  assert.match(appSource, /市场团队/);
  assert.match(appSource, /产品团队/);
  assert.doesNotMatch(appSource, /买了就赢|直接冲榜|羁绊 [a-z-]+/);
});
